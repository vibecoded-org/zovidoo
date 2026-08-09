import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, defaultFreePlayRecords, defaultSkillProgress } from './models';
import { ProgressService } from './progress.service';
import { StorageService } from './storage.service';

describe('ProgressService metrics', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [ProgressService, StorageService] });
  });

  it('uses first-attempt results for accuracy and all misses for errors', () => {
    const storage = TestBed.inject(StorageService);
    storage.replace({
      version: 4,
      settings: structuredClone(DEFAULT_SETTINGS),
      sessions: [{ id: 'mixed-attempts', type: 'interval', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 30_000, questions: 2, correctAnswers: 2, firstAttemptCorrect: 1, incorrectAnswers: 3, difficulty: 1 }],
      skillProgress: defaultSkillProgress(),
      freePlayRecords: defaultFreePlayRecords(),
    });

    const snapshot = TestBed.inject(ProgressService).snapshot();
    expect(snapshot.accuracy).toBe(50);
    expect(snapshot.incorrect).toBe(3);
  });
});
