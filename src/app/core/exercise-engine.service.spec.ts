import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';
import { exerciseDefinition } from './exercise-definitions';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';
describe('ExerciseEngineService', () => {
  const engine = (): ExerciseEngineService => { TestBed.configureTestingModule({ providers: [MusicTheoryService, ExerciseEngineService, { provide: TranslationService, useValue: { t: (key: string) => key } }] }); return TestBed.inject(ExerciseEngineService); };
  it('uses the configured number of interval choices at the first and last levels', () => { const service = engine(); const beginner = service.generate('interval', 1, () => .2); const advanced = service.generate('interval', 10, () => .2); expect(beginner.options.length).toBe(2); expect(advanced.options.length).toBe(4); expect(new Set(advanced.options).size).toBe(4); expect(advanced.options).toContain(advanced.correctAnswer); });
  it('uses note references, keyboard alternatives and octave ranges from the level profile', () => { const service = engine(); const beginner = service.generate('note', 1, () => .4); const advanced = service.generate('note', 10, () => .4); expect(beginner.options.length).toBe(2); expect(beginner.referencePitches?.length).toBe(2); expect(beginner.audio.kind).toBe('progression'); expect(beginner.audio.notes.every(note => /3$/.test(note))).toBeTrue(); expect(advanced.options.length).toBe(12); expect(advanced.referencePitches).toBeUndefined(); expect(advanced.audio.notes[0]).toMatch(/[3-5]$/); });
  it('makes progression recognition a single step with complete chord-sequence options', () => {
    const question = engine().generate('progression', 10, () => .2, { progressionLength: 4 });
    expect(exerciseDefinition('progression').flow).toBe('single-answer');
    expect(question.options.length).toBe(4);
    expect(question.options).toContain(question.correctAnswer);
    question.options.forEach(option => expect(option.split(' – ').length).toBe(4));
  });

  it('creates the new harmonic, inversion, cadence and rhythm prompts as four-choice questions', () => {
    const service = engine();
    const harmonic = service.generate('harmonic-interval', 10, () => .25);
    const inversion = service.generate('inversion', 10, () => .25);
    const cadence = service.generate('cadence', 10, () => .25);
    const rhythm = service.generate('rhythm', 10, () => .25);
    [harmonic, inversion, cadence, rhythm].forEach(question => {
      expect(question.options.length).toBe(4);
      expect(question.options).toContain(question.correctAnswer);
    });
    expect(harmonic.audio.kind).toBe('chord');
    expect(cadence.audio.kind).toBe('progression');
    expect(rhythm.audio.rhythm?.length).toBeGreaterThan(0);
    expect(inversion.audio.notes.length).toBe(4);
  });

  it('uses closer cadence and rhythm alternatives at higher difficulty', () => {
    const service = engine();
    const cadenceBeginner = service.generate('cadence', 1, () => .2);
    const cadenceAdvanced = service.generate('cadence', 4, () => .2);
    const rhythmBeginner = service.generate('rhythm', 1, () => .2);
    const rhythmAdvanced = service.generate('rhythm', 4, () => .2);
    expect(cadenceBeginner.options).not.toEqual(cadenceAdvanced.options);
    expect(rhythmBeginner.options).not.toEqual(rhythmAdvanced.options);
  });
});
