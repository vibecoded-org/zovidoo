import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';

describe('progression length configuration', () => {
  const engine = new ExerciseEngineService(new MusicTheoryService());
  it('keeps every 3-chord answer option at three chords', () => {
    const question = engine.generate('progression', 1, () => .3, { progressionLength: 3 });
    question.options.forEach(option => expect(option.split(' – ').length).toBe(3));
  });
});
