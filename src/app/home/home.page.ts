import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressService } from '../core/progress.service';
import { StorageService } from '../core/storage.service';
import { IonContent } from '@ionic/angular/standalone';
import { TranslationService } from '../core/translation.service';
import { PracticePreloadService } from '../core/practice-preload.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonContent],
})
export class HomePage implements OnInit {
  readonly progress = inject(ProgressService);
  readonly storage = inject(StorageService);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly practicePreload = inject(PracticePreloadService);

  ngOnInit(): void { if (!this.storage.profile()) { void this.router.navigateByUrl('/onboarding'); return; } this.practicePreload.schedule(); }
  quickPractice(): void { void this.router.navigateByUrl('/practice/quick'); }
  goalPercent(): number { return Math.min(100, this.progress.snapshot().todayQuestions / this.storage.settings().dailyGoal * 100); }
  heatmapDays(): { key: string; active: boolean; label: string }[] { const active = this.progress.snapshot().activeDays; return Array.from({ length: 28 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (27 - index)); const key = this.progress.dateKey(date); return { key, active: active.has(key), label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }; }); }
  greeting(): string { const hour = new Date().getHours(); return hour < 12 ? this.i18n.t('goodMorning') : hour < 18 ? this.i18n.t('goodAfternoon') : this.i18n.t('goodEvening'); }
}
