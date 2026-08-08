import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

describe('progression length configuration', () => {
  const engine = (): ExerciseEngineService => { TestBed.configureTestingModule({ providers: [MusicTheoryService, ExerciseEngineService, { provide: TranslationService, useValue: { t: (key: string) => key } }] }); return TestBed.inject(ExerciseEngineService); };
  it('keeps every 3-chord answer option at three chords', () => {
    const question = engine().generate('progression', 1, () => .3, { progressionLength: 3 });
    question.options.forEach(option => expect(option.split(' – ').length).toBe(3));
  });
});
