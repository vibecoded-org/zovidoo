import { Injectable, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storage = inject(StorageService);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() { effect(() => this.schedule(this.storage.settings().dailyReminder.enabled, this.storage.settings().dailyReminder.time)); }

  async requestPermission(): Promise<boolean> { if (!this.supported()) return false; return (await Notification.requestPermission()) === 'granted'; }
  supported(): boolean { return typeof window !== 'undefined' && 'Notification' in window; }

  private schedule(enabled: boolean, time: string): void {
    if (this.timer) clearTimeout(this.timer);
    if (!enabled || !this.supported() || Notification.permission !== 'granted') return;
    const [hours, minutes] = time.split(':').map(Number); const next = new Date(); next.setHours(hours, minutes, 0, 0); if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    this.timer = setTimeout(() => { new Notification('Zovidoo', { body: 'Time for a focused listening session.' }); this.schedule(true, time); }, next.getTime() - Date.now());
  }
}
