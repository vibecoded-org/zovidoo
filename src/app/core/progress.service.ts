import { Injectable, computed } from '@angular/core';
import { ExerciseType, SessionSummary } from './models';
import { StorageService } from './storage.service';

export interface ProgressSnapshot { totalSessions: number; totalQuestions: number; correct: number; incorrect: number; accuracy: number; totalMinutes: number; todayQuestions: number; todayAccuracy: number; currentStreak: number; longestStreak: number; weeklyDays: number; monthlyDays: number; activeDays: Set<string>; byType: Record<ExerciseType, number>; }
const dateKey = (value: string | Date): string => { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const priorDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);

@Injectable({ providedIn: 'root' })
export class ProgressService {
  readonly snapshot = computed<ProgressSnapshot>(() => this.aggregate(this.storage.sessions()));
  constructor(private readonly storage: StorageService) {}
  dateKey = dateKey;
  private aggregate(sessions: SessionSummary[]): ProgressSnapshot {
    const activeDays = new Set(sessions.map(s => dateKey(s.completedAt)));
    const totalQuestions = sessions.reduce((sum, s) => sum + s.questions, 0);
    const correct = sessions.reduce((sum, s) => sum + s.correctAnswers, 0);
    const incorrect = sessions.reduce((sum, s) => sum + s.incorrectAnswers, 0);
    const today = dateKey(new Date());
    const todaySessions = sessions.filter(s => dateKey(s.completedAt) === today);
    const todayQuestions = todaySessions.reduce((sum, s) => sum + s.questions, 0);
    const todayCorrect = todaySessions.reduce((sum, s) => sum + s.correctAnswers, 0);
    const byType: Record<ExerciseType, number> = { note: 0, interval: 0, chord: 0, 'chord-symbol': 0, progression: 0, 'progression-chords': 0 };
    for (const s of sessions) byType[s.type] += s.questions ? Math.round(s.correctAnswers / s.questions * 100) : 0;
    const since = (days: number): number => { const threshold = new Date(); threshold.setDate(threshold.getDate() - days + 1); return [...activeDays].filter(day => new Date(`${day}T12:00:00`) >= threshold).length; };
    return { totalSessions: sessions.length, totalQuestions, correct, incorrect, accuracy: totalQuestions ? Math.round(correct / totalQuestions * 100) : 0, totalMinutes: Math.round(sessions.reduce((sum, s) => sum + s.durationMs, 0) / 60000), todayQuestions, todayAccuracy: todayQuestions ? Math.round(todayCorrect / todayQuestions * 100) : 0, currentStreak: this.streak(activeDays), longestStreak: this.longest(activeDays), weeklyDays: since(7), monthlyDays: since(30), activeDays, byType };
  }
  private streak(days: Set<string>): number { let count = 0; let cursor = new Date(); if (!days.has(dateKey(cursor))) cursor = priorDay(cursor); while (days.has(dateKey(cursor))) { count++; cursor = priorDay(cursor); } return count; }
  private longest(days: Set<string>): number { const ordered = [...days].sort(); let best = 0; let run = 0; let previous = ''; for (const day of ordered) { run = previous && dateKey(priorDay(new Date(`${day}T12:00:00`))) === previous ? run + 1 : 1; best = Math.max(best, run); previous = day; } return best; }
}
