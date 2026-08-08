import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseType } from '../core/models';
import { EXERCISE_DEFINITIONS } from '../core/exercise-definitions';
import { IonContent } from '@ionic/angular/standalone';
import { TranslationService } from '../core/translation.service';
const exercises = EXERCISE_DEFINITIONS;
@Component({ selector: 'app-practice', templateUrl: './practice.page.html', styleUrls: ['./features.scss'], standalone: true, imports: [IonContent] })
export class PracticePage {
  exercises = exercises;
  constructor(private readonly router: Router, readonly i18n: TranslationService) {}
  open(type: ExerciseType): void { void this.router.navigate(['/practice', type]); }
  quick(): void { this.open(exercises[Math.floor(Math.random() * exercises.length)].id); }
  title(type: ExerciseType): string { return this.i18n.t(`exercise${this.key(type)}`); }
  description(type: ExerciseType): string { return this.i18n.t(`exercise${this.key(type)}Description`); }
  difficulty(type: ExerciseType): string { return this.i18n.t(type === 'chord' || type === 'progression-chords' ? 'easy' : 'beginner'); }
  private key(type: ExerciseType): string { return ({ note: 'Note', interval: 'Interval', chord: 'Chord', 'chord-symbol': 'ChordSymbol', progression: 'Progression', 'progression-chords': 'ProgressionChords' })[type]; }
}
