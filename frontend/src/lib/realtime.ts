import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const brokerURL = apiBaseURL.replace(/^http/, "ws") + "/ws";

let client: Client | null = null;
const onConnectHooks = new Set<() => void>();

/**
 * Thin singleton over a STOMP client — chat and notifications push through here instead of polling.
 * Everything the client subscribes to lives under `/user/queue/...`, which Spring resolves to the
 * caller's own authenticated session only, so there's nothing to authorize per-destination.
 */
export function connect(token: string) {
  if (client?.active) return;
  client = new Client({
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => onConnectHooks.forEach((hook) => hook()),
  });
  client.activate();
}

export function disconnect() {
  client?.deactivate();
  client = null;
}

export function isConnected(): boolean {
  return client?.connected ?? false;
}

/** Runs once after every successful (re)connect — use it to catch up on anything missed while disconnected. */
export function onConnect(hook: () => void): () => void {
  onConnectHooks.add(hook);
  return () => onConnectHooks.delete(hook);
}

/** Subscribes to a destination; returns an unsubscribe function. No-ops (returns a no-op) if not yet connected — call from an `onConnect` hook or after `connect()`. */
export function subscribe<T>(destination: string, handler: (payload: T) => void): () => void {
  if (!client) return () => {};

  let sub: StompSubscription | null = null;
  const doSubscribe = () => {
    sub = client!.subscribe(destination, (msg: IMessage) => handler(JSON.parse(msg.body) as T));
  };

  if (client.connected) {
    doSubscribe();
  }
  const unhook = onConnect(doSubscribe);

  return () => {
    unhook();
    sub?.unsubscribe();
  };
}
