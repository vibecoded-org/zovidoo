import { StorageService } from './storage.service';

describe('StorageService migrations and validation', () => {
  beforeEach(() => localStorage.clear());

  it('migrates schema 1 backups into local skill progress', () => {
    const service = new StorageService();
    const data = service.parseImport(JSON.stringify({ schemaVersion: 1, data: { version: 1, settings: {}, sessions: [{ id: 'one', type: 'interval', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 1_000, questions: 2, correctAnswers: 2, incorrectAnswers: 2, firstAttemptCorrect: 1, difficulty: 1 }] } }));
    expect(data.version).toBe(4);
    expect(data.skillProgress.interval.attempts).toBe(2);
    expect(data.skillProgress.interval.score).toBeLessThan(50);
  });

  it('rejects unsupported backups without replacing existing data', () => {
    const service = new StorageService();
    expect(() => service.parseImport(JSON.stringify({ schemaVersion: 99, data: {} }))).toThrow();
    expect(service.sessions()).toEqual([]);
  });

  it('preserves existing skill scores while adding new exercise skills', () => {
    const service = new StorageService();
    const data = service.parseImport(JSON.stringify({ schemaVersion: 2, data: { version: 2, settings: {}, sessions: [], skillProgress: { interval: { score: 74, level: 4, attempts: 10, recentResults: [true], updatedAt: new Date().toISOString() } } } }));
    expect(data.version).toBe(4);
    expect(data.skillProgress.interval.score).toBe(74);
    expect(data.skillProgress.interval.level).toBe(8);
    expect(data.skillProgress.rhythm.score).toBe(50);
    expect(data.freePlayRecords.interval[1]).toBe(0);
  });

  it('rejects oversized backup files before parsing them', () => {
    const service = new StorageService();
    expect(() => service.parseImport('x'.repeat(5 * 1024 * 1024 + 1))).toThrow();
  });

  it('restores a saved profile in a new service instance', () => {
    const first = new StorageService();
    first.saveProfile('Ada');
    const reloaded = new StorageService();
    expect(reloaded.profile()?.name).toBe('Ada');
  });

  it('migrates removed instrument presets to the sampled piano', () => {
    const service = new StorageService();
    const data = service.parseImport(JSON.stringify({ schemaVersion: 3, data: { version: 3, settings: { instrument: 'warm-pad' }, sessions: [], skillProgress: {} } }));
    expect(data.settings.instrument).toBe('piano');
  });

  it('defaults playback to 70 percent of maximum output', () => {
    const service = new StorageService();
    expect(Math.pow(10, service.settings().volume / 20)).toBeCloseTo(.7, 2);
  });

  it('upgrades the former hidden default volume to 70 percent', () => {
    const service = new StorageService();
    const data = service.parseImport(JSON.stringify({ schemaVersion: 3, data: { version: 3, settings: { volume: -8 }, sessions: [], skillProgress: {} } }));
    expect(Math.pow(10, data.settings.volume / 20)).toBeCloseTo(.7, 2);
  });
});
