import { Component, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { NotificationService } from '../core/notification.service';
import { StorageService } from '../core/storage.service';
import { IonContent, IonInput, IonRange, IonSelect, IonSelectOption, IonToggle } from '@ionic/angular/standalone';
import { LanguageSelectorComponent } from '../shared/language-selector.component';
import { TranslationService } from '../core/translation.service';
import { AudioEngineService } from '../core/audio-engine.service';
import { Instrument } from '../core/models';
@Component({ selector: 'app-settings', templateUrl: './settings.page.html', styleUrls: ['./features.scss'], standalone: true, imports: [IonContent, IonInput, IonRange, IonSelect, IonSelectOption, IonToggle, LanguageSelectorComponent] })
export class SettingsPage {
  readonly storage = inject(StorageService);
  readonly notifications = inject(NotificationService);
  readonly i18n = inject(TranslationService);
  private readonly alerts = inject(AlertController);
  private readonly audio = inject(AudioEngineService);

  importMessage = '';
  updateGoal(goal: string): void { this.storage.updateSettings({ dailyGoal: Number(goal) }); }
  updateInstrument(instrument: Instrument): void { this.storage.updateSettings({ instrument }); this.audio.setInstrument(instrument); }
  volumePercent(): number { return Math.round(Math.pow(10, this.storage.settings().volume / 20) * 100); }
  updateVolume(value: number): void {
    const percent = Math.max(0, Math.min(100, Math.round(Number(value))));
    const volume = percent === 0 ? -60 : Math.max(-60, 20 * Math.log10(percent / 100));
    this.storage.updateSettings({ volume });
    this.audio.setVolume(volume);
  }
  updateReminderTime(time: string): void { this.storage.updateSettings({ dailyReminder: { ...this.storage.settings().dailyReminder, time } }); }
  async dailyChange(enabled: boolean): Promise<void> { if (enabled && !await this.notifications.requestPermission()) { this.importMessage = this.i18n.t('notificationsUnavailable'); return; } this.storage.updateSettings({ dailyReminder: { ...this.storage.settings().dailyReminder, enabled } }); }
  download(): void { const blob = new Blob([this.storage.export()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `zovidoo-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); }
  async importFile(event: Event): Promise<void> { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; try { const data = this.storage.parseImport(await file.text()); const alert = await this.alerts.create({ header: this.i18n.t('restoreBackupTitle'), message: this.i18n.t('restoreBackupMessage', { count: data.sessions.length }), buttons: [{ text: this.i18n.t('cancel'), role: 'cancel' }, { text: this.i18n.t('restore'), handler: () => { this.storage.replace(data); this.importMessage = this.i18n.t('backupRestored'); } }] }); await alert.present(); } catch { this.importMessage = this.i18n.t('importFailed'); } }
  async reset(): Promise<void> { const alert = await this.alerts.create({ header: this.i18n.t('resetTitle'), message: this.i18n.t('resetMessage'), buttons: [{ text: this.i18n.t('cancel'), role: 'cancel' }, { text: this.i18n.t('reset'), role: 'destructive', handler: () => this.storage.reset() }] }); await alert.present(); }
}
