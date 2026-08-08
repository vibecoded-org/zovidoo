import { Injectable, computed, signal } from '@angular/core';
import { AppData, DEFAULT_SETTINGS, UserProfile, AppSettings, SessionSummary } from './models';

const STORAGE_KEY = 'zovidoo-ear-training';
const LEGACY_STORAGE_KEY = 'sonora-ear-training';
const emptyData = (): AppData => ({ version: 1, settings: structuredClone(DEFAULT_SETTINGS), sessions: [] });

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly state = signal<AppData>(this.restore());
  readonly data = this.state.asReadonly();
  readonly profile = computed(() => this.state().profile);
  readonly settings = computed(() => this.state().settings);
  readonly sessions = computed(() => this.state().sessions);

  saveProfile(name: string): void { this.update({ profile: { name: name.trim(), createdAt: new Date().toISOString() } }); }
  updateSettings(settings: Partial<AppSettings>): void { this.update({ settings: { ...this.state().settings, ...settings } }); }
  addSession(session: SessionSummary): void { this.update({ sessions: [session, ...this.state().sessions].slice(0, 2000) }); }
  replace(data: AppData): void { this.state.set(data); this.persist(); }
  reset(): void { this.state.set(emptyData()); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_STORAGE_KEY); }
  export(): string { return JSON.stringify({ app: 'Zovidoo', schemaVersion: 1, exportedAt: new Date().toISOString(), data: this.state() }, null, 2); }
  parseImport(raw: string): AppData {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('This file is not valid JSON.');
    const candidate = parsed as { schemaVersion?: unknown; data?: unknown };
    if (candidate.schemaVersion !== 1 || !candidate.data || typeof candidate.data !== 'object') throw new Error('This backup uses an unsupported schema.');
    return this.migrate(candidate.data as Partial<AppData>);
  }
  private restore(): AppData { try { const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY); const data = raw ? this.migrate(JSON.parse(raw) as Partial<AppData>) : emptyData(); if (!localStorage.getItem(STORAGE_KEY) && raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data; } catch { return emptyData(); } }
  private migrate(data: Partial<AppData>): AppData {
    return { version: 1, profile: this.validProfile(data.profile), settings: { ...structuredClone(DEFAULT_SETTINGS), ...(data.settings ?? {}) }, sessions: Array.isArray(data.sessions) ? data.sessions.filter(this.validSession).slice(0, 2000) : [] };
  }
  private validProfile(profile: unknown): UserProfile | undefined { return profile && typeof profile === 'object' && typeof (profile as UserProfile).name === 'string' ? profile as UserProfile : undefined; }
  private validSession(session: unknown): session is SessionSummary { return !!session && typeof session === 'object' && typeof (session as SessionSummary).id === 'string' && typeof (session as SessionSummary).completedAt === 'string'; }
  private update(change: Partial<AppData>): void { this.state.update(data => ({ ...data, ...change })); this.persist(); }
  private persist(): void { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state())); }
}
