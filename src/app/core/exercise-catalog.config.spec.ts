import { enabledExerciseTypes, EXERCISE_CATALOG, EXERCISE_CONTENT, isExerciseEnabled } from './exercise-catalog.config';
import { EXERCISE_TYPES } from './models';

describe('exercise catalog configuration', () => {
  it('configures every exercise with five complete difficulty profiles', () => {
    EXERCISE_TYPES.forEach(type => {
      const exercise = EXERCISE_CATALOG[type];
      expect(exercise.id).toBe(type);
      expect(exercise.questionCount).toBeGreaterThan(0);
      [1, 2, 3, 4, 5].forEach(level => {
        const profile = exercise.levels[level as 1 | 2 | 3 | 4 | 5];
        expect(profile.choiceCount).toBeGreaterThan(1);
        expect(['core', 'extended']).toContain(profile.contentScope);
      });
    });
  });

  it('keeps the configurable musical pools usable', () => {
    expect(EXERCISE_CONTENT.intervals.length).toBeGreaterThanOrEqual(4);
    expect(EXERCISE_CONTENT.progressions.some(progression => progression.length === 3)).toBeTrue();
    expect(EXERCISE_CONTENT.progressions.some(progression => progression.length === 4)).toBeTrue();
    expect(EXERCISE_CONTENT.cadences.length).toBeGreaterThanOrEqual(4);
    expect(EXERCISE_CONTENT.rhythms.length).toBeGreaterThanOrEqual(4);
  });

  it('treats the enabled flag as opt-out', () => {
    expect(isExerciseEnabled('rhythm')).toBeTrue();
    expect(enabledExerciseTypes()).toContain('rhythm');
  });
});
