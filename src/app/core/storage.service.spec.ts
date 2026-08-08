import { StorageService } from './storage.service';

describe('StorageService migrations and validation', () => {
  beforeEach(() => localStorage.clear());

  it('migrates schema 1 backups into local skill progress', () => {
    const service = new StorageService();
    const data = service.parseImport(JSON.stringify({ schemaVersion: 1, data: { version: 1, settings: {}, sessions: [{ id: 'one', type: 'interval', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 1_000, questions: 2, correctAnswers: 2, incorrectAnswers: 2, firstAttemptCorrect: 1, difficulty: 1 }] } }));
    expect(data.version).toBe(3);
    expect(data.skillProgress.interval.attempts).toBe(2);
    expect(data.skillProgress.interval.score).toBeLessThan(50);
  });

  it('rejects unsupported backups without replacing existing data', () => {
    const service = new StorageService();
    expect(() => service.parseImport(JSON.stringify({ schemaVersion: 99, data: {} }))).toThrow();
    expect(service.sessions()).toEqual([]);
  });
});
