import { Component } from '@angular/core';
import { StorageService } from '../core/storage.service';
import { SessionSummary } from '../core/models';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TranslationService } from '../core/translation.service';
@Component({ selector: 'app-history', templateUrl: './history.page.html', styleUrls: ['./features.scss'], standalone: true, imports: [IonContent, DatePipe, RouterLink] })
export class HistoryPage {
  constructor(readonly storage: StorageService, readonly i18n: TranslationService) {}
  groups(): { date: string; sessions: SessionSummary[] }[] { const map = new Map<string, SessionSummary[]>(); for (const session of this.storage.sessions()) { const key = new Date(session.completedAt).toLocaleDateString(this.i18n.locale(), { weekday: 'long', month: 'short', day: 'numeric' }); map.set(key, [...(map.get(key) ?? []), session]); } return [...map].map(([date, sessions]) => ({ date, sessions })); }
  label(type: SessionSummary['type']): string { return this.i18n.t(`history${({ note: 'Note', interval: 'Interval', chord: 'Chord', 'chord-symbol': 'ChordSymbol', progression: 'Progression', 'progression-chords': 'ProgressionChords' })[type]}`); }
  accuracy(session: SessionSummary): number { return session.questions ? Math.round(session.firstAttemptCorrect / session.questions * 100) : 0; }
  duration(session: SessionSummary): string { return `${Math.max(1, Math.round(session.durationMs / 60000))} ${this.i18n.t('minute')}`; }
}
