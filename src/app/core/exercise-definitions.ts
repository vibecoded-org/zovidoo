import { ExerciseDefinition, ExerciseType } from './models';
import { EXERCISE_DEFINITIONS, exerciseConfiguration } from './exercise-catalog.config';

export { EXERCISE_DEFINITIONS };
export const exerciseDefinition = (id: ExerciseType): ExerciseDefinition => exerciseConfiguration(id);
