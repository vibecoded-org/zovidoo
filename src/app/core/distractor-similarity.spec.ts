import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

describe('adaptive musical distractors', () => {
  const engine = (): ExerciseEngineService => { TestBed.configureTestingModule({ providers: [MusicTheoryService, ExerciseEngineService, { provide: TranslationService, useValue: { t: (key: string) => key } }] }); return TestBed.inject(ExerciseEngineService); };
  it('keeps chord-symbol distractors in the same quality family', () => {
    const question = engine().generate('chord-symbol', 4, () => .1);
    const suffix = question.correctAnswer.replace(/^[A-G](?:b|#)?/, '');
    question.options.filter(option => option !== question.correctAnswer).forEach(option => expect(option.replace(/^[A-G](?:b|#)?/, '')).toBe(suffix));
  });
  it('uses closer interval alternatives at higher difficulty', () => {
    const exerciseEngine = engine();
    const beginner = exerciseEngine.generate('interval', 1, () => .4);
    const advanced = exerciseEngine.generate('interval', 4, () => .4);
    expect(beginner.options).not.toEqual(advanced.options);
  });
});
