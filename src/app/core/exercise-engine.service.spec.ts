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
});
