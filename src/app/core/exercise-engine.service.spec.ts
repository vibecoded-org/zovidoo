import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';
import { exerciseDefinition } from './exercise-definitions';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';
describe('ExerciseEngineService', () => {
  const engine = (): ExerciseEngineService => { TestBed.configureTestingModule({ providers: [MusicTheoryService, ExerciseEngineService, { provide: TranslationService, useValue: { t: (key: string) => key } }] }); return TestBed.inject(ExerciseEngineService); };
  it('creates four distinct meaningful interval choices', () => { const question = engine().generate('interval', 1, () => .2); expect(question.options.length).toBe(4); expect(new Set(question.options).size).toBe(4); expect(question.options).toContain(question.correctAnswer); });
  it('uses the octave range requested for note exercises', () => { const question = engine().generate('note', 1, () => .4); expect(question.audio.notes[0]).toMatch(/[3-5]$/); });
  it('makes progression recognition a single step with complete chord-sequence options', () => {
    const question = engine().generate('progression', 1, () => .2, { progressionLength: 4 });
    expect(exerciseDefinition('progression').flow).toBe('single-answer');
    expect(question.options.length).toBe(4);
    expect(question.options).toContain(question.correctAnswer);
    question.options.forEach(option => expect(option.split(' – ').length).toBe(4));
  });

  it('creates the new harmonic, inversion, cadence and rhythm prompts as four-choice questions', () => {
    const service = engine();
    const harmonic = service.generate('harmonic-interval', 2, () => .25);
    const inversion = service.generate('inversion', 2, () => .25);
    const cadence = service.generate('cadence', 2, () => .25);
    const rhythm = service.generate('rhythm', 2, () => .25);
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
