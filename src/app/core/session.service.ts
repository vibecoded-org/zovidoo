import { Injectable, signal } from '@angular/core';
import { Difficulty, ExerciseQuestion, ExerciseState, ExerciseType, SessionSummary } from './models';
import { exerciseDefinition } from './exercise-definitions';
import { ExerciseEngineService, ExerciseGenerationOptions } from './exercise-engine.service';
import { StorageService } from './storage.service';

type PendingTransition = 'next-question' | 'chord-root' | 'next-progression-chord' | 'complete';
export interface ActiveSession { type: ExerciseType; difficulty: Difficulty; startedAt: number; questions: ExerciseQuestion[]; index: number; mistakes: number; completedMistakes: number; completedQuestions: number; firstAttemptCorrect: number; currentQuestionMistakes: number; attempted: boolean; state: ExerciseState; chordStage?: 'quality' | 'root'; progressionChordIndex?: number; replayCount: number; generation: ExerciseGenerationOptions; pendingTransition?: PendingTransition; }
export interface AnswerResult { correct: boolean; complete: boolean; }

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly active = signal<ActiveSession | undefined>(undefined);
  constructor(private readonly engine: ExerciseEngineService, private readonly storage: StorageService) {}
  start(type: ExerciseType, difficulty: Difficulty = 1): ActiveSession {
    const definition = exerciseDefinition(type);
    const generation: ExerciseGenerationOptions = type === 'progression' || type === 'progression-chords' ? { progressionLength: Math.random() < .5 ? 3 : 4 } : {};
    const active: ActiveSession = { type, difficulty, startedAt: Date.now(), questions: Array.from({ length: definition.questionCount }, () => this.engine.generate(type, difficulty, Math.random, generation)), index: 0, mistakes: 0, completedMistakes: 0, completedQuestions: 0, firstAttemptCorrect: 0, currentQuestionMistakes: 0, attempted: false, state: 'waitingForAnswer', chordStage: definition.flow === 'quality-then-root' ? 'quality' : undefined, progressionChordIndex: definition.flow === 'progression-sequence' ? 0 : undefined, replayCount: 0, generation };
    this.active.set(active); return active;
  }
  answer(value: string): AnswerResult {
    const active = this.active(); if (!active || active.state === 'correct') return { correct: false, complete: false };
    const question = active.questions[active.index]; const definition = exerciseDefinition(active.type); const expected = this.expectedAnswer(active, question);
    if (value !== expected) { this.active.set({ ...active, mistakes: active.mistakes + 1, currentQuestionMistakes: active.currentQuestionMistakes + 1, attempted: true, state: 'incorrect' }); return { correct: false, complete: false }; }
    const pendingTransition = this.nextTransition(active, question, definition.flow);
    const completesQuestion = pendingTransition === 'next-question' || pendingTransition === 'complete';
    this.active.set({ ...active, completedQuestions: active.completedQuestions + Number(completesQuestion), completedMistakes: active.completedMistakes + (completesQuestion ? active.currentQuestionMistakes : 0), firstAttemptCorrect: active.firstAttemptCorrect + Number(completesQuestion && active.currentQuestionMistakes === 0), state: 'correct', pendingTransition });
    return { correct: true, complete: pendingTransition === 'complete' };
  }
  advance(): boolean {
    const active = this.active(); if (!active?.pendingTransition) return false;
    if (active.pendingTransition === 'complete') { const completed = { ...active, state: 'completed' as const, pendingTransition: undefined }; this.active.set(completed); this.persist(completed); return false; }
    if (active.pendingTransition === 'chord-root') { this.active.set({ ...active, state: 'waitingForAnswer', chordStage: 'root', attempted: false, pendingTransition: undefined }); return true; }
    if (active.pendingTransition === 'next-progression-chord') { this.active.set({ ...active, state: 'waitingForAnswer', progressionChordIndex: (active.progressionChordIndex ?? 0) + 1, attempted: false, pendingTransition: undefined }); return true; }
    const next = active.index + 1; const definition = exerciseDefinition(active.type);
    this.active.set({ ...active, index: next, currentQuestionMistakes: 0, state: 'waitingForAnswer', attempted: false, chordStage: definition.flow === 'quality-then-root' ? 'quality' : undefined, progressionChordIndex: definition.flow === 'progression-sequence' ? 0 : undefined, pendingTransition: undefined }); return true;
  }
  resumeAnswering(): void { const active = this.active(); if (active?.state === 'incorrect') this.active.set({ ...active, state: 'waitingForAnswer' }); }
  currentExpectedAnswer(): string { const active = this.active(); return active ? this.expectedAnswer(active, active.questions[active.index]) : ''; }
  currentAnswerOptions(): string[] {
    const active = this.active(); if (!active) return [];
    const question = active.questions[active.index];
    return 'optionsByChord' in question ? question.optionsByChord[active.progressionChordIndex ?? 0] : question.options;
  }
  replay(): void { const active = this.active(); if (active) this.active.set({ ...active, replayCount: active.replayCount + 1 }); }
  cancel(): void { const active = this.active(); if (!active) return; if (active.state !== 'completed' && active.completedQuestions > 0) this.persist(active); this.active.set(undefined); }
  clear(): void { this.active.set(undefined); }
  private expectedAnswer(active: ActiveSession, question: ExerciseQuestion): string {
    const flow = exerciseDefinition(active.type).flow;
    if (flow === 'quality-then-root' && active.chordStage === 'root') return 'root' in question ? question.root : '';
    if (flow === 'progression-sequence') return 'chordSymbols' in question ? question.chordSymbols[active.progressionChordIndex ?? 0] : '';
    return question.correctAnswer;
  }
  private nextTransition(active: ActiveSession, question: ExerciseQuestion, flow: ReturnType<typeof exerciseDefinition>['flow']): PendingTransition {
    if (flow === 'quality-then-root' && active.chordStage === 'quality') return 'chord-root';
    if (flow === 'progression-sequence' && 'chordSymbols' in question && (active.progressionChordIndex ?? 0) < question.chordSymbols.length - 1) return 'next-progression-chord';
    return active.index === active.questions.length - 1 ? 'complete' : 'next-question';
  }
  private persist(active: ActiveSession): void { const summary: SessionSummary = { id: crypto.randomUUID(), type: active.type, startedAt: new Date(active.startedAt).toISOString(), completedAt: new Date().toISOString(), durationMs: Date.now() - active.startedAt, questions: active.completedQuestions, correctAnswers: active.completedQuestions, incorrectAnswers: active.completedMistakes, firstAttemptCorrect: active.firstAttemptCorrect, difficulty: active.difficulty }; this.storage.addSession(summary); }
}
