import { browser } from "$app/environment";
import { unreadCount } from "$lib/api/matching";

class NotificationStore {
  count = $state(0);
  private interval: ReturnType<typeof setInterval> | null = null;

  start() {
    if (!browser || this.interval) return;
    this.fetch();
    this.interval = setInterval(() => this.fetch(), 15000); // every 15s
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.count = 0;
  }

  async fetch() {
    try {
      const result = await unreadCount();
      this.count = result.count;
    } catch {
      // silently fail
    }
  }
}

export const notifications = new NotificationStore();
