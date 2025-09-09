class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return false;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered:', registration);
      this.registration = registration;
      return true;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showNotification(title: string, options: NotificationOptions = {}) {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return;

    if (this.registration) {
      // Use service worker registration for better browser support
      await this.registration.showNotification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        ...options,
      });
    } else {
      // Fallback to basic notification
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    }
  }

  async notifyTaskCreated(taskTitle: string, assignedTo: string) {
    await this.showNotification(`New Task: ${taskTitle}`, {
      body: `Assigned to: ${assignedTo}`,
      tag: 'new-task',
      data: { type: 'task_created', taskTitle, assignedTo }
    });
  }

  async notifyMaterialRequest(materialType: string) {
    await this.showNotification(`Material Request: ${materialType}`, {
      body: 'A new material request has been submitted',
      tag: 'material-request',
      data: { type: 'material_request', materialType }
    });
  }
}

export const pushManager = new PushNotificationManager();