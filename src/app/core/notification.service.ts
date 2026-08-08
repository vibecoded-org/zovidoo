import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class NotificationService {
  async requestPermission(): Promise<boolean> { if (!('Notification' in window)) return false; return (await Notification.requestPermission()) === 'granted'; }
  supported(): boolean { return 'Notification' in window; }
}
