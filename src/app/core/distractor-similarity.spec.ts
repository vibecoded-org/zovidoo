import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';

describe('adaptive musical distractors', () => {
  const engine = new ExerciseEngineService(new MusicTheoryService());
  it('keeps chord-symbol distractors in the same quality family', () => {
    const question = engine.generate('chord-symbol', 4, () => .1);
    const suffix = question.correctAnswer.replace(/^[A-G](?:b|#)?/, '');
    question.options.filter(option => option !== question.correctAnswer).forEach(option => expect(option.replace(/^[A-G](?:b|#)?/, '')).toBe(suffix));
  });
  it('uses closer interval alternatives at higher difficulty', () => {
    const beginner = engine.generate('interval', 1, () => .4);
    const advanced = engine.generate('interval', 4, () => .4);
    expect(beginner.options).not.toEqual(advanced.options);
  });
});
