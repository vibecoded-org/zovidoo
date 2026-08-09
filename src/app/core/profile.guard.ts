import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { enabledExerciseTypes, isExerciseEnabled } from './exercise-catalog.config';
import { EXERCISE_TYPES, ExerciseType } from './models';
import { StorageService } from './storage.service';

export const profileGuard: CanActivateFn = () => inject(StorageService).profile() ? true : inject(Router).createUrlTree(['/onboarding']);

export const exerciseEnabledGuard: CanActivateFn = route => {
  const type = route.paramMap.get('type');
  const router = inject(Router);
  if (type === 'quick') return enabledExerciseTypes().length ? true : router.createUrlTree(['/tabs/practice']);
  return type && EXERCISE_TYPES.includes(type as ExerciseType) && isExerciseEnabled(type as ExerciseType)
    ? true
    : router.createUrlTree(['/tabs/practice']);
};
