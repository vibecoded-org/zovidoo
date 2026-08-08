import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';
import { SessionService } from './session.service';
import { StorageService } from './storage.service';

describe('SessionService feedback transitions', () => {
  const create = (): SessionService => new SessionService(new ExerciseEngineService(new MusicTheoryService()), { addSession: () => undefined } as unknown as StorageService);

  it('keeps the current question in place until feedback advances it', () => {
    const service = create(); service.start('interval'); const before = service.active()!; const answer = before.questions[0].correctAnswer;
    expect(service.answer(answer).correct).toBeTrue();
    expect(service.active()!.index).toBe(0);
    expect(service.active()!.state).toBe('correct');
    service.advance();
    expect(service.active()!.index).toBe(1);
    expect(service.active()!.state).toBe('waitingForAnswer');
  });

  it('uses chord-symbol answers for every position of a progression', () => {
    const service = create(); service.start('progression-chords'); const session = service.active()!; const question = session.questions[0];
    if (!('chordSymbols' in question)) { fail('Expected a progression chord question'); return; }
    expect(service.currentExpectedAnswer()).toBe(question.chordSymbols[0]);
    expect(question.options).toContain(question.chordSymbols[0]);
    expect(question.options).toContain(question.chordSymbols[1]);
  });

  it('persists only completed questions when a session is cancelled', () => {
    const summaries: import('./models').SessionSummary[] = [];
    const service = new SessionService(new ExerciseEngineService(new MusicTheoryService()), { addSession: (summary: import('./models').SessionSummary) => summaries.push(summary) } as unknown as StorageService);
    service.start('interval');
    const first = service.active()!;
    service.answer(first.questions[0].correctAnswer);
    service.advance();
    service.cancel();
    expect(summaries.length).toBe(1);
    expect(summaries[0].questions).toBe(1);
    expect(summaries[0].correctAnswers).toBe(1);
  });
});
