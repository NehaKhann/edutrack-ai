#!/usr/bin/env bash
# Creates a Matrix account. This is the ONLY way to get an account on this homeserver —
# public registration is disabled in homeserver.yaml, so this script (run by the Principal,
# on the server) is the entire "invite-only" mechanism.
#
# Usage:
#   ./create-user.sh sana.tariq 'a-strong-temp-password' user
#   ./create-user.sh ayesha.malik 'a-strong-temp-password' admin
#
# Run from the chat/ directory. The resulting username becomes @sana.tariq:chat.your-domain
# in Element — give the teacher their username + temp password and tell them to change the
# password after first login (Element: Settings → Security → Change password).

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <username> <password> [user|admin]" >&2
  exit 1
fi

USERNAME="$1"
PASSWORD="$2"
ROLE="${3:-user}"

ADMIN_FLAG="--no-admin"
if [ "$ROLE" = "admin" ]; then
  ADMIN_FLAG="--admin"
fi

docker compose exec synapse register_new_matrix_user \
  --user "$USERNAME" \
  --password "$PASSWORD" \
  "$ADMIN_FLAG" \
  --config /data/homeserver.yaml \
  http://localhost:8008
