// Fotizo notifications service worker: shows push notifications (such as a
// buyer's urgent alert) even when no Fotizo tab is open, and opens the right
// page when one is tapped. It does no caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Fotizo", {
      body: data.body || "",
      icon: "/icon-512.png",
      badge: "/favicon.png",
      tag: data.url || "fotizo",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only open pages on this site.
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === target.origin);
      if (open) return open.focus().then(() => open.navigate(target.href));
      return self.clients.openWindow(target.href);
    }),
  );
});
