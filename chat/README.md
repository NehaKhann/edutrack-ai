# Metropolitan School Chat — Matrix/Element deployment

A private, invite-only, end-to-end-encrypted chat system for teachers and the Principal — text, voice messages, images, documents, files, 1-to-1 and group chats — using **Matrix Synapse** (the homeserver) and **Element** (the official client, Android/iOS/Web). No public sign-up exists anywhere in this system; every account is created directly on the server by an admin.

## Why this isn't on Render/Neon/Cloudflare

Worth being upfront about before you spend time on this: Synapse genuinely cannot run on the free tiers you're already using.

- **Render free tier**: 512MB RAM and sleeps after 15 minutes idle. Synapse needs to stay running continuously to deliver messages in real time, and 512MB isn't enough headroom to run it stably even while awake.
- **Neon**: serverless Postgres that suspends when idle and reconnects on the next query — fine for a REST API, but Synapse expects a database it fully controls (specific `C` locale/collation set at creation time) and keeps persistent, high-frequency connections open. Fighting Neon's auto-suspend behavior would make chat delivery unreliable.

**The actual free path: Oracle Cloud's Always Free tier.** It gives a 4-core/24GB-RAM ARM (Ampere A1) compute instance, free forever — not a 12-month trial like AWS/GCP/Azure free tiers. That's comfortably enough to run the entire stack below. Signup requires a credit card for identity verification only; you won't be charged as long as you stay within the Always Free limits (same as the Cloudflare R2 situation from earlier in this project).

If you'd rather not create another cloud account, the fallback is any small VPS (Hetzner ~€4.50/mo is the cheapest reliable option) — but that's no longer free, so Oracle is the recommended path.

## Architecture

One VM running everything via Docker Compose:

| Service | Role |
|---|---|
| `synapse` | The Matrix homeserver — all messages, users, rooms live here |
| `postgres` | Synapse's database, self-hosted on the same VM (not Neon — see above) |
| `coturn` | TURN/STUN server — makes voice/video calls actually connect through NAT/firewalls |
| `element-web` | Optional browser client, for desktop use (mobile apps don't need this) |
| `caddy` | Reverse proxy — automatic free HTTPS via Let's Encrypt |

**No federation**: `federation_domain_whitelist: []` in the Synapse config means this server never talks to any other Matrix server (not matrix.org, not anyone's). It's a closed, private system — the opposite of federation, by design.

**Invite-only**: `enable_registration: false`. The only way to get an account is the Principal running `scripts/create-user.sh` on the server. There is no sign-up page, no public endpoint that creates accounts.

**End-to-end encryption**: on by default for private rooms/DMs in Element — the server (and whoever runs it) cannot read message content, only metadata (who's in a room, when messages were sent).

## What's already done

Everything in this `chat/` folder is a ready-to-deploy config — Docker Compose stack, Synapse config template, Caddy reverse proxy config, coturn config, Element Web config, and the account-creation script. What's left needs your action (creating the VM), since I can't provision cloud infrastructure on your behalf.

## Step 1 — Create the Oracle Cloud VM

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com) (free tier, card required for verification only).
2. Once in the console: **Compute → Instances → Create Instance**.
3. **Image**: Ubuntu 22.04 (or latest LTS).
4. **Shape**: click "Change shape" → **Ampere → VM.Standard.A1.Flex** → set **4 OCPUs / 24GB RAM** (the full Always Free allowance).
5. Add your SSH key (or let Oracle generate one and download it).
6. Create the instance, note its **public IP address**.

> Known friction point: the free ARM shape sometimes shows "Out of host capacity" in busy regions. If that happens, try a different Availability Domain in the same region, or try again in a few minutes/hours — this is a known, temporary Oracle Free Tier issue, not something wrong with your account.

## Step 2 — Open the firewall (Oracle Security List + OS firewall)

In the Oracle console, on your VM's subnet: **Security Lists → Add Ingress Rules**, and add rules allowing:

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH (probably already open) |
| 80, 443 | TCP | HTTP/HTTPS (Caddy) |
| 3478 | TCP + UDP | TURN |
| 5349 | TCP + UDP | TURN over TLS |
| 49152–49172 | UDP | TURN relay range |

Then SSH into the VM and mirror these in the OS-level firewall (Ubuntu ships with `iptables` rules Oracle manages, but confirm with `sudo iptables -L` — if using `ufw` instead, `sudo ufw allow <port>/tcp` etc. for each row above).

## Step 3 — Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in for the group change to apply
```

## Step 4 — DNS (Cloudflare)

In your Cloudflare dashboard, for your domain, add:

| Type | Name | Value | Proxy status |
|---|---|---|---|
| A | `chat` | your VM's public IP | **DNS only** (grey cloud, NOT orange) |
| A | `element` | your VM's public IP | **DNS only** (grey cloud) |

Important: these must be **DNS only**, not proxied. Cloudflare's proxy interferes with Let's Encrypt's certificate challenge and with Matrix's long-lived sync connections. (Your main EduTrack app can stay proxied — this is specific to the chat subdomains.)

## Step 5 — Configure secrets

On the VM, clone this repo (or just copy the `chat/` folder), then:

```bash
cd chat
cp .env.example .env
cp synapse/homeserver.yaml.example synapse/homeserver.yaml
cp caddy/Caddyfile.example caddy/Caddyfile
cp coturn/turnserver.conf.example coturn/turnserver.conf
```

Generate three secrets:
```bash
openssl rand -hex 32   # → SYNAPSE_DB_PASSWORD (.env)
openssl rand -hex 32   # → registration_shared_secret (synapse/homeserver.yaml)
openssl rand -hex 32   # → turn_shared_secret (synapse/homeserver.yaml) — MUST also match
                        #   static-auth-secret in coturn/turnserver.conf
```

Then edit each file:
- **`.env`**: paste the DB password.
- **`synapse/homeserver.yaml`**: replace every `CHANGE_ME.example` with your real domain (e.g. `chat.metropolitanschool.com`), paste the DB password (must match `.env`), the registration secret, and the TURN secret.
- **`caddy/Caddyfile`**: replace `CHANGE_ME.example` with your real domain.
- **`coturn/turnserver.conf`**: replace the TURN secret (must match homeserver.yaml) and the realm domain.
- **`element/config.json`**: replace `CHANGE_ME.example` with your real domain (this file has no secrets, it's committed as-is with a placeholder).

## Step 6 — Launch

```bash
docker compose up -d
docker compose logs -f synapse   # watch for "Synapse now listening on TCP port 8008"
```

## Step 7 — Create accounts (this IS the invite system)

```bash
chmod +x scripts/create-user.sh
./scripts/create-user.sh ayesha.malik 'choose-a-strong-temp-password' admin   # Principal, first account
./scripts/create-user.sh sana.tariq 'choose-a-strong-temp-password' user     # each teacher
```

Give each person their username + temp password directly (in person, or via the existing EduTrack app's notification system) — tell them to change the password after first login.

## Step 8 — Get everyone onto mobile

Both are the official, real Element apps — nothing custom to build or maintain:

- **Android**: [Play Store](https://play.google.com/store/apps/details?id=im.vector.app) (or F-Droid / direct APK if Play Store access is a problem for your mom's phone, same as the EduTrack app)
- **iOS**: [App Store](https://apps.apple.com/app/element-messenger/id1083446067)

On first launch: **"I already have an account"** → tap **"Edit"** next to the homeserver field → enter `https://chat.your-domain.com` → log in with the username/password from Step 7.

Desktop/browser users can go straight to `https://element.your-domain.com` instead.

## Backups

The only thing that matters is the Postgres volume (`synapse-postgres-data`) and the media store (`synapse-media`) — everything else regenerates from config. A simple cron job on the VM:

```bash
docker compose exec -T postgres pg_dump -U synapse synapse | gzip > /backups/synapse-$(date +%F).sql.gz
```

## Security notes

- **Push notifications**: Element apps use a push gateway to wake up your phone for new-message notifications (standard for any messaging app — this is how Apple/Google push works). By default this routes through Element's own Sygnal gateway, which sees *that* a message arrived and for whom, but never the message content (that stays end-to-end encrypted). Self-hosting your own Sygnal instance removes this too, but is genuinely optional — worth knowing about, not worth the added complexity for a small school deployment.
- Keep `synapse/homeserver.yaml`, `.env`, and `coturn/turnserver.conf` out of git (already gitignored) — they hold real secrets.
- `report_stats: false` and `enable_metrics: false` are set — Synapse won't phone home any usage data anywhere.

## Cost

$0/month, indefinitely, as long as you stay within Oracle's Always Free limits (4 OCPU/24GB is the full allowance for one account — this deployment uses well under that).

## Not built (possible future work, not required for this to work today)

- **SSO with existing EduTrack accounts** — right now Matrix accounts are separate logins from the school app. Possible later via OIDC, but a real chunk of additional work on the Spring Boot side — skipped for now since invite-only account creation already satisfies "only invited users can join."
- **Self-hosted Sygnal** (push notification privacy, see above).
