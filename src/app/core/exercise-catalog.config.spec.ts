import { enabledExerciseTypes, EXERCISE_CATALOG, EXERCISE_CONTENT, isExerciseEnabled } from './exercise-catalog.config';
import { DIFFICULTIES, EXERCISE_TYPES } from './models';

describe('exercise catalog configuration', () => {
  it('configures every exercise with ten complete difficulty profiles', () => {
    EXERCISE_TYPES.forEach(type => {
      const exercise = EXERCISE_CATALOG[type];
      expect(exercise.id).toBe(type);
      expect(exercise.questionCount).toBeGreaterThan(0);
      DIFFICULTIES.forEach(level => {
        const profile = exercise.levels[level];
        expect(profile.choiceCount).toBeGreaterThan(1);
        expect(['core', 'extended']).toContain(profile.contentScope);
        expect(profile.maxMistakesPerQuestion).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('declares the requested note reference, keyboard and octave curve', () => {
    const levels = EXERCISE_CATALOG.note.levels;
    expect(levels[1].note).toEqual(jasmine.objectContaining({ keyboardOptionCount: 2, octaveRange: [3, 3], references: { count: 2, selection: 'random' } }));
    expect(levels[8].note).toEqual(jasmine.objectContaining({ keyboardOptionCount: 8, octaveRange: [3, 4], references: { count: 1, selection: 'random' } }));
    expect(levels[10].note).toEqual(jasmine.objectContaining({ keyboardOptionCount: 12, octaveRange: [3, 5], references: { count: 0 } }));
    expect(levels[1].maxMistakesPerQuestion).toBe(5);
    expect(levels[10].maxMistakesPerQuestion).toBe(0);
  });

  it('keeps the configurable musical pools usable', () => {
    expect(EXERCISE_CONTENT.intervals.length).toBeGreaterThanOrEqual(4);
    expect(EXERCISE_CONTENT.progressions.some(progression => progression.length === 3)).toBeTrue();
    expect(EXERCISE_CONTENT.progressions.some(progression => progression.length === 4)).toBeTrue();
    expect(EXERCISE_CONTENT.cadences.length).toBeGreaterThanOrEqual(4);
    expect(EXERCISE_CONTENT.rhythms.length).toBeGreaterThanOrEqual(4);
  });

  it('omits explicitly disabled exercises', () => {
    expect(isExerciseEnabled('rhythm')).toBeFalse();
    expect(enabledExerciseTypes()).not.toContain('rhythm');
    expect(enabledExerciseTypes()).toContain('interval');
  });
});
