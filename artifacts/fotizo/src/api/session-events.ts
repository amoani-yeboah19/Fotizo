// A private request answered 401 means the server no longer recognises this
// browser's session (signed out elsewhere, password changed, expired). The
// auth context listens and re-checks the session instead of carrying on as if
// still signed in.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onSessionRejected(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportSessionRejected(): void {
  for (const listener of listeners) listener();
}
