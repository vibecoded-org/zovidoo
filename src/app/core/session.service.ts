import { Injectable, signal, inject } from '@angular/core';
import { Difficulty, ExerciseQuestion, ExerciseResult, ExerciseState, ExerciseType, SessionKind, SessionSummary, SkillResult } from './models';
import { exerciseDefinition } from './exercise-definitions';
import { enabledExerciseTypes, exerciseConfiguration, isExerciseEnabled } from './exercise-catalog.config';
import { ExerciseEngineService, ExerciseGenerationOptions } from './exercise-engine.service';
import { StorageService } from './storage.service';

type PendingTransition = 'next-question' | 'chord-root' | 'next-progression-chord' | 'complete';
type SkillResults = Partial<Record<ExerciseType, SkillResult>>;
export interface ActiveSession { type: SessionKind; difficulty: Difficulty; startedAt: number; questions: ExerciseQuestion[]; index: number; mistakes: number; completedMistakes: number; completedQuestions: number; firstAttemptCorrect: number; currentQuestionMistakes: number; attempted: boolean; state: ExerciseState; chordStage?: 'quality' | 'root'; progressionChordIndex?: number; replayCount: number; generation: ExerciseGenerationOptions; skillResults: SkillResults; exerciseResults: ExerciseResult[]; freePlay?: true; currentStreak?: number; bestStreak?: number; pendingTransition?: PendingTransition; }
export interface AnswerResult { correct: boolean; complete: boolean; failed: boolean; }

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly engine = inject(ExerciseEngineService);
  private readonly storage = inject(StorageService);

  readonly active = signal<ActiveSession | undefined>(undefined);

  start(type: SessionKind, difficulty?: Difficulty): ActiveSession {
    if (type !== 'quick' && !isExerciseEnabled(type)) {
      throw new Error(`Exercise "${type}" is disabled.`);
    }
    const sessionDifficulty = difficulty ?? (type === 'quick' ? 1 : this.storage.skillProgress()[type].level); const generation: ExerciseGenerationOptions = { progressionLength: Math.random() < .5 ? 3 : 4 };
    const questions = type === 'quick' ? this.quickQuestions() : Array.from({ length: exerciseDefinition(type).questionCount }, () => this.engine.generate(type, sessionDifficulty, Math.random, generation));
    const first = questions[0]; const flow = exerciseDefinition(first.type).flow;
    const active: ActiveSession = { type, difficulty: sessionDifficulty, startedAt: Date.now(), questions, index: 0, mistakes: 0, completedMistakes: 0, completedQuestions: 0, firstAttemptCorrect: 0, currentQuestionMistakes: 0, attempted: false, state: 'waitingForAnswer', chordStage: flow === 'quality-then-root' ? 'quality' : undefined, progressionChordIndex: flow === 'progression-sequence' ? 0 : undefined, replayCount: 0, generation, skillResults: {}, exerciseResults: [] };
    this.active.set(active); return active;
  }
  startFreePlay(type: ExerciseType, difficulty: Difficulty): ActiveSession {
    if (!isExerciseEnabled(type)) throw new Error(`Exercise "${type}" is disabled.`);
    const generation: ExerciseGenerationOptions = { progressionLength: Math.random() < .5 ? 3 : 4 };
    const question = this.engine.generate(type, difficulty, Math.random, generation); const flow = exerciseDefinition(question.type).flow;
    const active: ActiveSession = { type, difficulty, startedAt: Date.now(), questions: [question], index: 0, mistakes: 0, completedMistakes: 0, completedQuestions: 0, firstAttemptCorrect: 0, currentQuestionMistakes: 0, attempted: false, state: 'waitingForAnswer', chordStage: flow === 'quality-then-root' ? 'quality' : undefined, progressionChordIndex: flow === 'progression-sequence' ? 0 : undefined, replayCount: 0, generation, skillResults: {}, exerciseResults: [], freePlay: true, currentStreak: 0, bestStreak: this.storage.freePlayRecords()[type][difficulty] };
    this.active.set(active); return active;
  }
  answer(value: string, questionDurationMs = 0): AnswerResult {
    const active = this.active(); if (!active || active.state === 'correct') return { correct: false, complete: false, failed: false };
    const question = active.questions[active.index]; const expected = this.expectedAnswer(active, question);
    if (value !== expected) {
      const currentQuestionMistakes = active.currentQuestionMistakes + 1; const maximum = exerciseConfiguration(question.type).levels[active.difficulty].maxMistakesPerQuestion;
      if (currentQuestionMistakes > maximum) {
        const pendingTransition = this.questionCompletionTransition(active); const completed = this.recordQuestion({ ...active, mistakes: active.mistakes + 1, currentQuestionMistakes, attempted: true }, question, questionDurationMs, false);
        this.active.set({ ...completed, state: 'incorrect', pendingTransition }); return { correct: false, complete: pendingTransition === 'complete', failed: true };
      }
      this.active.set({ ...active, mistakes: active.mistakes + 1, currentQuestionMistakes, attempted: true, state: 'incorrect' }); return { correct: false, complete: false, failed: false };
    }
    const pendingTransition = this.nextTransition(active, question);
    const completesQuestion = pendingTransition === 'next-question' || pendingTransition === 'complete';
    const completed = completesQuestion ? this.recordQuestion(active, question, questionDurationMs, true) : active;
    this.active.set({ ...completed, state: 'correct', pendingTransition });
    return { correct: true, complete: pendingTransition === 'complete', failed: false };
  }
  advance(): boolean {
    const active = this.active(); if (!active?.pendingTransition) return false;
    if (active.pendingTransition === 'complete') { const completed = { ...active, state: 'completed' as const, pendingTransition: undefined }; this.active.set(completed); this.persist(completed); return false; }
    if (active.pendingTransition === 'chord-root') { this.active.set({ ...active, state: 'waitingForAnswer', chordStage: 'root', attempted: false, pendingTransition: undefined }); return true; }
    if (active.pendingTransition === 'next-progression-chord') { this.active.set({ ...active, state: 'waitingForAnswer', progressionChordIndex: (active.progressionChordIndex ?? 0) + 1, attempted: false, pendingTransition: undefined }); return true; }
    const nextQuestion = active.freePlay ? this.engine.generate(active.type as ExerciseType, active.difficulty, Math.random, active.generation) : active.questions[active.index + 1]; const flow = exerciseDefinition(nextQuestion.type).flow;
    this.active.set({ ...active, questions: active.freePlay ? [nextQuestion] : active.questions, index: active.freePlay ? 0 : active.index + 1, currentQuestionMistakes: 0, state: 'waitingForAnswer', attempted: false, chordStage: flow === 'quality-then-root' ? 'quality' : undefined, progressionChordIndex: flow === 'progression-sequence' ? 0 : undefined, pendingTransition: undefined }); return true;
  }
  resumeAnswering(): void { const active = this.active(); if (active?.state === 'incorrect') this.active.set({ ...active, state: 'waitingForAnswer' }); }
  currentExpectedAnswer(): string { const active = this.active(); return active ? this.expectedAnswer(active, active.questions[active.index]) : ''; }
  currentAnswerOptions(): string[] { const active = this.active(); if (!active) return []; const question = active.questions[active.index]; return 'optionsByChord' in question ? question.optionsByChord[active.progressionChordIndex ?? 0] : question.options; }
  replay(): void { const active = this.active(); if (active) this.active.set({ ...active, replayCount: active.replayCount + 1 }); }
  cancel(): void { const active = this.active(); if (!active) return; if (!active.freePlay && active.state !== 'completed' && active.completedQuestions > 0) this.persist(active); this.active.set(undefined); }
  clear(): void { this.active.set(undefined); }

  private quickQuestions(): ExerciseQuestion[] {
    const priority = (type: ExerciseType): number => { const skill = this.storage.skillProgress()[type]; return skill.score - skill.recentResults.slice(-5).filter(result => !result).length * 3; };
    const enabled = enabledExerciseTypes();
    if (!enabled.length) throw new Error('At least one exercise must be enabled.');
    const ranked = [...enabled].sort((a, b) => priority(a) - priority(b) || Math.random() - .5);
    const skills = Array.from({ length: 5 }, (_, index) => ranked[index % ranked.length]);
    return skills.map(type => this.engine.generate(type, this.storage.skillProgress()[type].level, Math.random, type === 'progression' || type === 'progression-chords' ? { progressionLength: Math.random() < .5 ? 3 : 4 } : {}));
  }
  private recordSkillResult(results: SkillResults, type: ExerciseType, mistakes: number): SkillResults { const prior = results[type] ?? { questions: 0, firstAttemptCorrect: 0, incorrectAnswers: 0 }; return { ...results, [type]: { questions: prior.questions + 1, firstAttemptCorrect: prior.firstAttemptCorrect + Number(mistakes === 0), incorrectAnswers: prior.incorrectAnswers + mistakes } }; }
  private recordQuestion(active: ActiveSession, question: ExerciseQuestion, questionDurationMs: number, passed: boolean): ActiveSession { const mistakes = active.currentQuestionMistakes; const skillResults = active.freePlay ? active.skillResults : this.recordSkillResult(active.skillResults, question.type, mistakes); const currentStreak = active.freePlay ? passed ? (active.currentStreak ?? 0) + 1 : 0 : active.currentStreak; const bestStreak = active.freePlay ? Math.max(active.bestStreak ?? 0, currentStreak ?? 0) : active.bestStreak; if (active.freePlay && bestStreak! > (active.bestStreak ?? 0)) this.storage.updateFreePlayRecord(question.type, active.difficulty, bestStreak!); return { ...active, completedQuestions: active.completedQuestions + 1, completedMistakes: active.completedMistakes + mistakes, firstAttemptCorrect: active.firstAttemptCorrect + Number(passed && mistakes === 0), skillResults, exerciseResults: [...active.exerciseResults, { id: question.id, type: question.type, durationMs: Math.max(0, Math.round(questionDurationMs)), incorrectAnswers: mistakes }], currentStreak, bestStreak }; }
  private expectedAnswer(active: ActiveSession, question: ExerciseQuestion): string { const flow = exerciseDefinition(question.type).flow; if (flow === 'quality-then-root' && active.chordStage === 'root') return 'root' in question ? question.root : ''; if (flow === 'progression-sequence') return 'chordSymbols' in question ? question.chordSymbols[active.progressionChordIndex ?? 0] : ''; return question.correctAnswer; }
  private questionCompletionTransition(active: ActiveSession): PendingTransition { return active.freePlay || active.index < active.questions.length - 1 ? 'next-question' : 'complete'; }
  private nextTransition(active: ActiveSession, question: ExerciseQuestion): PendingTransition { const flow = exerciseDefinition(question.type).flow; if (flow === 'quality-then-root' && active.chordStage === 'quality') return 'chord-root'; if (flow === 'progression-sequence' && 'chordSymbols' in question && (active.progressionChordIndex ?? 0) < question.chordSymbols.length - 1) return 'next-progression-chord'; return this.questionCompletionTransition(active); }
  private persist(active: ActiveSession): void { const exerciseBreakdown = active.exerciseResults.reduce<Partial<Record<ExerciseType, number>>>((breakdown, result) => ({ ...breakdown, [result.type]: (breakdown[result.type] ?? 0) + 1 }), {}); const summary: SessionSummary = { id: crypto.randomUUID(), type: active.type, startedAt: new Date(active.startedAt).toISOString(), completedAt: new Date().toISOString(), durationMs: active.exerciseResults.reduce((total, result) => total + result.durationMs, 0), questions: active.completedQuestions, correctAnswers: active.completedQuestions, incorrectAnswers: active.completedMistakes, firstAttemptCorrect: active.firstAttemptCorrect, difficulty: active.difficulty, exerciseBreakdown, skillResults: active.skillResults, exerciseResults: active.exerciseResults }; this.storage.addSession(summary); }
}
