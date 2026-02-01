// Notification Deduplication Service
// Prevents duplicate ride notifications from being sent to drivers

interface NotificationCache {
    [key: string]: number; // notification_id -> timestamp
}

class NotificationDeduplicationService {
    private sentNotifications: NotificationCache = {};
    private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Check if notification has already been sent recently
     */
    hasBeenSent(requestId: string, driverId: string, version: number): boolean {
        const notificationId = `${requestId}:${driverId}:${version}`;
        const sentTime = this.sentNotifications[notificationId];

        if (sentTime && Date.now() - sentTime < this.TTL_MS) {
            console.log(`Notification ${notificationId} already sent, skipping`);
            return true;
        }

        return false;
    }

    /**
     * Mark notification as sent
     */
    markAsSent(requestId: string, driverId: string, version: number): void {
        const notificationId = `${requestId}:${driverId}:${version}`;
        this.sentNotifications[notificationId] = Date.now();

        // Cleanup old entries
        this.cleanup();
    }

    /**
     * Remove expired entries to prevent memory leak
     */
    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, timestamp] of Object.entries(this.sentNotifications)) {
            if (now - timestamp > this.TTL_MS) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => delete this.sentNotifications[key]);
    }

    /**
     * Clear all cached notifications (for testing)
     */
    clear(): void {
        this.sentNotifications = {};
    }
}

// Singleton instance
export const notificationDedup = new NotificationDeduplicationService();

/**
 * Client-side deduplication for driver app
 * Use this in the driver dashboard to prevent showing duplicate ride requests
 */
export class ClientSideDedup {
    private processedNotifications: Set<string> = new Set();
    private readonly MAX_SIZE = 100;

    /**
     * Check if notification has been processed
     */
    hasProcessed(notificationId: string): boolean {
        return this.processedNotifications.has(notificationId);
    }

    /**
     * Mark notification as processed
     */
    markAsProcessed(notificationId: string): void {
        this.processedNotifications.add(notificationId);

        // Keep only last MAX_SIZE entries
        if (this.processedNotifications.size > this.MAX_SIZE) {
            const first = this.processedNotifications.values().next().value;
            if (first) {
                this.processedNotifications.delete(first);
            }
        }
    }

    /**
     * Clear all processed notifications
     */
    clear(): void {
        this.processedNotifications.clear();
    }
}
