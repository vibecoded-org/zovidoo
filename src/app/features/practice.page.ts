import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseType, SessionKind } from '../core/models';
import { EXERCISE_DEFINITIONS } from '../core/exercise-definitions';
import { IonContent } from '@ionic/angular/standalone';
import { TranslationService } from '../core/translation.service';
import { StorageService } from '../core/storage.service';
const exercises = EXERCISE_DEFINITIONS;
@Component({ selector: 'app-practice', templateUrl: './practice.page.html', styleUrls: ['./features.scss'], standalone: true, imports: [IonContent] })
export class PracticePage {
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);
  readonly storage = inject(StorageService);

  exercises = exercises;
  open(type: SessionKind): void { void this.router.navigate(['/practice', type]); }
  quick(): void { this.open('quick'); }
  title(type: ExerciseType): string { return this.i18n.t(`exercise${this.key(type)}`); }
  description(type: ExerciseType): string { return this.i18n.t(`exercise${this.key(type)}Description`); }
  difficulty(type: ExerciseType): string { const skill = this.storage.skillProgress()[type]; return this.i18n.t('skillLevel', { level: skill.level, score: skill.score }); }
  private key(type: ExerciseType): string { return ({ note: 'Note', interval: 'Interval', chord: 'Chord', 'chord-symbol': 'ChordSymbol', progression: 'Progression', 'progression-chords': 'ProgressionChords' })[type]; }
}
