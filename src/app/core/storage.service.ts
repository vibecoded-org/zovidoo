import { Injectable, computed, signal } from '@angular/core';
import { AppData, AppSettings, DEFAULT_SETTINGS, EXERCISE_TYPES, ExerciseType, SessionSummary, SkillProgressMap, UserProfile, defaultSkillProgress } from './models';

const STORAGE_KEY = 'zovidoo-ear-training';
const LEGACY_STORAGE_KEY = 'sonora-ear-training';
const CORRUPT_STORAGE_KEY = `${STORAGE_KEY}-corrupt`;
const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
const emptyData = (): AppData => ({ version: 3, settings: structuredClone(DEFAULT_SETTINGS), sessions: [], skillProgress: defaultSkillProgress() });
const validExerciseType = (value: unknown): value is ExerciseType => typeof value === 'string' && EXERCISE_TYPES.includes(value as ExerciseType);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const bounded = (value: unknown, minimum: number, maximum: number, fallback: number): number => finite(value) && value >= minimum && value <= maximum ? value : fallback;
const nonNegativeInteger = (value: unknown): value is number => finite(value) && Number.isInteger(value) && value >= 0;
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

@Injectable({ providedIn: 'root' })
export class StorageService {
  readonly persistenceError = signal(false);
  private readonly state = signal<AppData>(this.restore());
  readonly data = this.state.asReadonly();
  readonly profile = computed(() => this.state().profile);
  readonly settings = computed(() => this.state().settings);
  readonly sessions = computed(() => this.state().sessions);
  readonly skillProgress = computed(() => this.state().skillProgress);

  saveProfile(name: string): void { this.update({ profile: { name: name.trim().slice(0, 80), createdAt: new Date().toISOString() } }); }
  updateSettings(settings: Partial<AppSettings>): void { this.update({ settings: { ...this.state().settings, ...settings } }); }
  addSession(session: SessionSummary): void {
    const sessions = [session, ...this.state().sessions].slice(0, 2000);
    this.update({ sessions, skillProgress: this.applySkillResults(this.state().skillProgress, session) });
  }
  replace(data: AppData): void { this.state.set(this.migrate(data)); this.persist(); }
  reset(): void { this.state.set(emptyData()); try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_STORAGE_KEY); localStorage.removeItem(CORRUPT_STORAGE_KEY); this.persistenceError.set(false); } catch { this.persistenceError.set(true); } }
  export(): string { return JSON.stringify({ app: 'Zovidoo', schemaVersion: 3, exportedAt: new Date().toISOString(), data: this.state() }, null, 2); }
  parseImport(raw: string): AppData {
    if (raw.length > MAX_IMPORT_SIZE) throw new Error('This backup is too large.');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('This file is not valid JSON.');
    const candidate = parsed as { schemaVersion?: unknown; data?: unknown };
    if ((candidate.schemaVersion !== 1 && candidate.schemaVersion !== 2 && candidate.schemaVersion !== 3) || !candidate.data || typeof candidate.data !== 'object') throw new Error('This backup uses an unsupported schema.');
    if (!this.validBackupData(candidate.data as Partial<AppData>)) throw new Error('This backup contains invalid data.');
    return this.migrate(candidate.data as Partial<AppData>);
  }

  private restore(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      const data = raw ? this.migrate(JSON.parse(raw) as Partial<AppData>) : emptyData();
      if (!localStorage.getItem(STORAGE_KEY) && raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch {
      try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) localStorage.setItem(CORRUPT_STORAGE_KEY, raw); } catch { this.persistenceError.set(true); }
      return emptyData();
    }
  }
  private migrate(data: Partial<AppData>): AppData {
    const sessions = Array.isArray(data.sessions) ? data.sessions.filter(session => this.validSession(session)).map(session => this.normalizeSession(session)).slice(0, 2000) : [];
    const skillProgress = this.validSkillProgress(data.skillProgress) ? this.normalizeSkillProgress(data.skillProgress) : sessions.reduce((progress, session) => this.applySkillResults(progress, session), defaultSkillProgress());
    return { version: 3, profile: this.validProfile(data.profile), settings: this.normalizeSettings(data.settings), sessions, skillProgress };
  }
  private normalizeSettings(settings: Partial<AppSettings> | undefined): AppSettings {
    const source = settings ?? {};
    const daily = source.dailyReminder; const weekly = source.weeklyReminder;
    const instrument = ['piano', 'acoustic-guitar', 'electric-piano', 'organ', 'vibraphone', 'warm-pad', 'marimba', 'random'].includes(source.instrument ?? '') ? source.instrument as AppSettings['instrument'] : DEFAULT_SETTINGS.instrument;
    return { ...structuredClone(DEFAULT_SETTINGS), ...source, dailyGoal: bounded(source.dailyGoal, 1, 100, DEFAULT_SETTINGS.dailyGoal), volume: bounded(source.volume, -60, 0, DEFAULT_SETTINGS.volume), instrument, dailyReminder: { enabled: daily?.enabled === true, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(daily?.time ?? '') ? daily!.time : DEFAULT_SETTINGS.dailyReminder.time }, weeklyReminder: { enabled: weekly?.enabled === true, day: bounded(weekly?.day, 0, 6, DEFAULT_SETTINGS.weeklyReminder.day), time: /^([01]\d|2[0-3]):[0-5]\d$/.test(weekly?.time ?? '') ? weekly!.time : DEFAULT_SETTINGS.weeklyReminder.time } };
  }
  private normalizeSession(session: SessionSummary): SessionSummary {
    const questions = Math.max(0, Math.floor(session.questions));
    const exerciseBreakdown = this.normalizeExerciseBreakdown(session.exerciseBreakdown);
    const skillResults = this.normalizeSkillResults(session.skillResults);
    return { ...session, type: session.type === 'quick' ? 'quick' : session.type, questions, correctAnswers: Math.min(questions, Math.max(0, Math.floor(session.correctAnswers))), incorrectAnswers: Math.max(0, Math.floor(session.incorrectAnswers)), firstAttemptCorrect: Math.min(Math.max(0, Math.floor(session.firstAttemptCorrect)), questions), durationMs: Math.max(0, Math.floor(session.durationMs)), difficulty: bounded(session.difficulty, 1, 5, 1) as SessionSummary['difficulty'], ...(exerciseBreakdown ? { exerciseBreakdown } : {}), ...(skillResults ? { skillResults } : {}) };
  }
  private validProfile(profile: unknown): UserProfile | undefined { return profile && typeof profile === 'object' && typeof (profile as UserProfile).name === 'string' && (profile as UserProfile).name.trim() ? { name: (profile as UserProfile).name.trim().slice(0, 80), createdAt: typeof (profile as UserProfile).createdAt === 'string' ? (profile as UserProfile).createdAt : new Date().toISOString() } : undefined; }
  private validSession(session: unknown): session is SessionSummary { return !!session && typeof session === 'object' && typeof (session as SessionSummary).id === 'string' && (validExerciseType((session as SessionSummary).type) || (session as SessionSummary).type === 'quick') && validDate((session as SessionSummary).startedAt) && validDate((session as SessionSummary).completedAt) && finite((session as SessionSummary).durationMs) && (session as SessionSummary).durationMs >= 0 && nonNegativeInteger((session as SessionSummary).questions) && nonNegativeInteger((session as SessionSummary).correctAnswers) && nonNegativeInteger((session as SessionSummary).incorrectAnswers) && nonNegativeInteger((session as SessionSummary).firstAttemptCorrect) && (session as SessionSummary).correctAnswers <= (session as SessionSummary).questions && (session as SessionSummary).firstAttemptCorrect <= (session as SessionSummary).questions && bounded((session as SessionSummary).difficulty, 1, 5, 0) > 0 && this.validExerciseBreakdown((session as SessionSummary).exerciseBreakdown) && this.validSkillResults((session as SessionSummary).skillResults); }
  private validSkillProgress(progress: unknown): progress is Partial<SkillProgressMap> { return !!progress && typeof progress === 'object' && Object.entries(progress).every(([type, item]) => validExerciseType(type) && !!item && finite((item as SkillProgressMap[ExerciseType]).score) && finite((item as SkillProgressMap[ExerciseType]).level) && finite((item as SkillProgressMap[ExerciseType]).attempts) && Array.isArray((item as SkillProgressMap[ExerciseType]).recentResults)); }
  private validExerciseBreakdown(value: unknown): boolean { return value === undefined || (!!value && typeof value === 'object' && Object.entries(value).every(([type, questions]) => validExerciseType(type) && nonNegativeInteger(questions))); }
  private validSkillResults(value: unknown): boolean { return value === undefined || (!!value && typeof value === 'object' && Object.entries(value).every(([type, result]) => validExerciseType(type) && !!result && typeof result === 'object' && nonNegativeInteger((result as { questions?: unknown }).questions) && nonNegativeInteger((result as { firstAttemptCorrect?: unknown }).firstAttemptCorrect) && nonNegativeInteger((result as { incorrectAnswers?: unknown }).incorrectAnswers) && (result as { firstAttemptCorrect: number }).firstAttemptCorrect <= (result as { questions: number }).questions)); }
  private validBackupData(data: Partial<AppData>): boolean { return (!data.profile || !!this.validProfile(data.profile)) && (!data.sessions || (Array.isArray(data.sessions) && data.sessions.every(this.validSession))) && (!data.skillProgress || this.validSkillProgress(data.skillProgress)); }
  private normalizeExerciseBreakdown(value: SessionSummary['exerciseBreakdown']): SessionSummary['exerciseBreakdown'] { if (!value) return undefined; return Object.entries(value).reduce<Partial<Record<ExerciseType, number>>>((result, [type, questions]) => validExerciseType(type) && nonNegativeInteger(questions) ? { ...result, [type]: questions } : result, {}); }
  private normalizeSkillResults(value: SessionSummary['skillResults']): SessionSummary['skillResults'] { if (!value) return undefined; return Object.entries(value).reduce<NonNullable<SessionSummary['skillResults']>>((results, [type, result]) => validExerciseType(type) && !!result && nonNegativeInteger(result.questions) && nonNegativeInteger(result.firstAttemptCorrect) && nonNegativeInteger(result.incorrectAnswers) ? { ...results, [type]: { ...result, firstAttemptCorrect: Math.min(result.firstAttemptCorrect, result.questions) } } : results, {}); }
  private normalizeSkillProgress(progress: Partial<SkillProgressMap>): SkillProgressMap { const defaults = defaultSkillProgress(); for (const type of EXERCISE_TYPES) { const item = progress[type]; if (!item) continue; defaults[type] = { score: bounded(item.score, 0, 100, 50), level: bounded(item.level, 1, 5, 3) as 1 | 2 | 3 | 4 | 5, attempts: Math.max(0, Math.floor(item.attempts)), recentResults: item.recentResults.filter(value => typeof value === 'boolean').slice(-20), updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString() }; } return defaults; }
  private applySkillResults(progress: SkillProgressMap, session: SessionSummary): SkillProgressMap {
    const next = structuredClone(progress);
    const results = session.skillResults ?? (session.type === 'quick' ? {} : { [session.type]: { questions: session.questions, firstAttemptCorrect: session.firstAttemptCorrect, incorrectAnswers: session.incorrectAnswers } });
    for (const type of EXERCISE_TYPES) {
      const result = results[type]; if (!result?.questions) continue;
      const missedFirst = Math.max(0, result.questions - result.firstAttemptCorrect);
      const score = Math.max(0, Math.min(100, next[type].score + result.firstAttemptCorrect * 6 - missedFirst * 4 - Math.min(result.incorrectAnswers, result.questions) * 2));
      next[type] = { score, level: (Math.min(5, Math.max(1, Math.floor(score / 20) + 1)) as 1 | 2 | 3 | 4 | 5), attempts: next[type].attempts + result.questions, recentResults: [...next[type].recentResults, ...Array(result.firstAttemptCorrect).fill(true), ...Array(missedFirst).fill(false)].slice(-20), updatedAt: new Date().toISOString() };
    }
    return next;
  }
  private update(change: Partial<AppData>): void { this.state.update(data => ({ ...data, ...change })); this.persist(); }
  private persist(): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state())); this.persistenceError.set(false); } catch { this.persistenceError.set(true); } }
}
