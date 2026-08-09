import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonInput } from '@ionic/angular/standalone';
import { AudioEngineService } from '../core/audio-engine.service';
import { StorageService } from '../core/storage.service';
import { TranslationService } from '../core/translation.service';
import { LanguageSelectorComponent } from '../shared/language-selector.component';

@Component({ selector: 'app-onboarding', templateUrl: './onboarding.page.html', styleUrls: ['./onboarding.page.scss'], standalone: true, imports: [IonContent, IonInput, LanguageSelectorComponent] })
export class OnboardingPage {
  private readonly storage = inject(StorageService);
  private readonly audio = inject(AudioEngineService);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);

  name = ''; loading = false; errorMessage = '';
  setName(event: Event): void { this.name = (event.target as HTMLIonInputElement).value?.toString() ?? ''; }
  async begin(): Promise<void> {
    if (!this.name.trim()) return;
    this.loading = true; this.errorMessage = '';
    this.storage.saveProfile(this.name);
    if (this.storage.persistenceError()) { this.errorMessage = this.i18n.t('storageUnavailable'); this.loading = false; return; }
    try { await this.audio.initialize(); } catch { /* The exercise replay button can retry after the app has opened. */ }
    try { await this.router.navigateByUrl('/tabs/home'); } finally { this.loading = false; }
  }
}
