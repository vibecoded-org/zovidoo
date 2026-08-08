import { ExerciseEngineService } from './exercise-engine.service';
import { MusicTheoryService } from './music-theory.service';
import { SessionService } from './session.service';
import { StorageService } from './storage.service';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';
import { defaultSkillProgress } from './models';

describe('SessionService feedback transitions', () => {
  const create = (summaries: import('./models').SessionSummary[] = []): SessionService => { TestBed.configureTestingModule({ providers: [MusicTheoryService, ExerciseEngineService, SessionService, { provide: TranslationService, useValue: { t: (key: string) => key } }, { provide: StorageService, useValue: { addSession: (summary: import('./models').SessionSummary) => summaries.push(summary), skillProgress: () => defaultSkillProgress() } }] }); return TestBed.inject(SessionService); };

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
    const service = create(summaries);
    service.start('interval');
    const first = service.active()!;
    service.answer(first.questions[0].correctAnswer);
    service.advance();
    service.cancel();
    expect(summaries.length).toBe(1);
    expect(summaries[0].questions).toBe(1);
    expect(summaries[0].correctAnswers).toBe(1);
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
    service.answer(wrong);
    service.resumeAnswering();
    service.answer(service.currentExpectedAnswer());
    service.advance();
    service.cancel();
    expect(summaries[0].questions).toBe(1);
    expect(summaries[0].firstAttemptCorrect).toBe(0);
    expect(summaries[0].incorrectAnswers).toBe(1);
  });
});
