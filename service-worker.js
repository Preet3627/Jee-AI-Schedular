// This is a basic service worker file that will be managed by vite-plugin-pwa

// Listen for push notifications
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.log("Push event but no data");
        return;
    }

    try {
        const data = event.data.json();
        const title = data.title || "JEE Scheduler Pro";
        const options = {
            body: data.body,
            icon: '/icon-192.png', // Make sure you have an icon at this path in your public folder
            badge: '/badge-72.png', // A smaller icon for the notification bar
        };
        event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
        console.error("Error parsing push data:", e);
        // Fallback for plain text notifications
        const title = "JEE Scheduler Pro";
        const options = { body: event.data.text() };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // Focus or open a new window
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
