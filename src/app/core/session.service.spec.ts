import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';
import { SessionService } from './session.service';
import { StorageService } from './storage.service';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';
import { defaultFreePlayRecords, defaultSkillProgress } from './models';

describe('SessionService feedback transitions', () => {
  const create = (summaries: import('./models').SessionSummary[] = [], records: number[] = []): SessionService => { TestBed.configureTestingModule({ providers: [MusicTheoryService, ExerciseEngineService, SessionService, { provide: TranslationService, useValue: { t: (key: string) => key } }, { provide: StorageService, useValue: { addSession: (summary: import('./models').SessionSummary) => summaries.push(summary), skillProgress: () => defaultSkillProgress(), freePlayRecords: () => defaultFreePlayRecords(), updateFreePlayRecord: (_type: string, _level: number, streak: number) => records.push(streak) } }] }); return TestBed.inject(SessionService); };

  it('keeps the current question in place until feedback advances it', () => {
    const service = create(); service.start('interval'); const before = service.active()!; const answer = before.questions[0].correctAnswer;
    expect(service.answer(answer).correct).toBeTrue();
    expect(service.active()!.index).toBe(0);
    expect(service.active()!.state).toBe('correct');
    service.advance();
    expect(service.active()!.index).toBe(1);
    expect(service.active()!.state).toBe('waitingForAnswer');
  });

  it('generates chord-symbol answers for every position of a progression', () => {
    create(); const question = TestBed.inject(ExerciseEngineService).generate('progression-chords');
    if (!('chordSymbols' in question)) { fail('Expected a progression chord question'); return; }
    expect(question.correctAnswer).toBe(question.chordSymbols[0]);
    expect(question.options).toContain(question.chordSymbols[0]);
    expect(question.optionsByChord[1]).toContain(question.chordSymbols[1]);
  });

  it('persists only completed questions when a session is cancelled', () => {
    const summaries: import('./models').SessionSummary[] = [];
    const service = create(summaries);
    service.start('interval');
    const first = service.active()!;
    service.answer(first.questions[0].correctAnswer, 1_250);
    service.advance();
    service.cancel();
    expect(summaries.length).toBe(1);
    expect(summaries[0].questions).toBe(1);
    expect(summaries[0].correctAnswers).toBe(1);
    expect(summaries[0].exerciseBreakdown).toEqual({ interval: 1 });
    expect(summaries[0].durationMs).toBe(1_250);
    expect(summaries[0].exerciseResults).toEqual([{ id: first.questions[0].id, type: 'interval', durationMs: 1_250, incorrectAnswers: 0 }]);
  });
  it('builds a mixed quick session and records its completed skills', () => {
    const summaries: import('./models').SessionSummary[] = [];
    const service = create(summaries); const active = service.start('quick');
    expect(active.questions.length).toBe(5);
    expect(new Set(active.questions.map(question => question.type)).size).toBe(5);
    while (service.active()?.state !== 'completed') {
      service.answer(service.currentExpectedAnswer());
      service.advance();
    }
    expect(summaries[0].type).toBe('quick');
    expect(Object.values(summaries[0].exerciseBreakdown ?? {}).reduce((sum, value) => sum + value, 0)).toBe(5);
    expect(Object.keys(summaries[0].skillResults ?? {}).length).toBe(5);
  });

  it('records first-attempt accuracy separately from incorrect attempts', () => {
    const summaries: import('./models').SessionSummary[] = [];
    const service = create(summaries); service.start('interval');
    const wrong = service.currentAnswerOptions().find(answer => answer !== service.currentExpectedAnswer())!;
    service.answer(wrong, 1_100);
    service.resumeAnswering();
    service.answer(service.currentExpectedAnswer(), 2_800);
    service.advance();
    service.cancel();
    expect(summaries[0].questions).toBe(1);
    expect(summaries[0].firstAttemptCorrect).toBe(0);
    expect(summaries[0].incorrectAnswers).toBe(1);
    expect(summaries[0].exerciseResults?.[0].durationMs).toBe(2_800);
    expect(summaries[0].exerciseResults?.[0].incorrectAnswers).toBe(1);
  });
  it('fails and advances a question when its configured mistake limit is exceeded', () => {
    const service = create(); service.start('interval', 10);
    const wrong = service.currentAnswerOptions().find(answer => answer !== service.currentExpectedAnswer())!;
    const result = service.answer(wrong, 1_000);
    expect(result.failed).toBeTrue();
    expect(service.active()!.pendingTransition).toBe('next-question');
    service.advance();
    expect(service.active()!.index).toBe(1);
  });
  it('records Free Play streaks without saving normal sessions', () => {
    const summaries: import('./models').SessionSummary[] = []; const records: number[] = []; const service = create(summaries, records); service.startFreePlay('interval', 10);
    service.answer(service.currentExpectedAnswer(), 500); service.advance();
    expect(service.active()!.currentStreak).toBe(1);
    expect(records).toEqual([1]);
    service.cancel();
    expect(summaries).toEqual([]);
  });
});
