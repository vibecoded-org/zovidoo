import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { DIFFICULTIES, Difficulty, ExerciseType } from '../core/models';
import { EXERCISE_DEFINITIONS } from '../core/exercise-definitions';
import { exerciseTranslationKey, isExerciseEnabled } from '../core/exercise-catalog.config';
import { StorageService } from '../core/storage.service';
import { TranslationService } from '../core/translation.service';

const exercises = EXERCISE_DEFINITIONS.filter(exercise => isExerciseEnabled(exercise.id));

@Component({ selector: 'app-free-play', templateUrl: './free-play.page.html', styleUrls: ['./features.scss'], standalone: true, imports: [IonContent, IonSelect, IonSelectOption] })
export class FreePlayPage {
  private readonly router = inject(Router);
  readonly storage = inject(StorageService);
  readonly i18n = inject(TranslationService);
  readonly exercises = exercises;
  readonly levels = DIFFICULTIES;
  type: ExerciseType = exercises[0]?.id ?? 'note';
  level: Difficulty = 1;

  title(type: ExerciseType): string { return this.i18n.t(`exercise${exerciseTranslationKey(type)}`); }
  record(): number { return this.storage.freePlayRecords()[this.type][this.level]; }
  start(): void { void this.router.navigate(['/free-play', this.type, this.level]); }
}
