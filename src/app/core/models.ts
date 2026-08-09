export type ExerciseType = 'note' | 'interval' | 'harmonic-interval' | 'chord' | 'inversion' | 'chord-symbol' | 'progression' | 'progression-chords' | 'cadence' | 'rhythm';
export type SessionKind = ExerciseType | 'quick';
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type AppLanguage = 'en' | 'es' | 'pt-BR';
export type Instrument = 'piano' | 'acoustic-guitar';
export type PitchClass = 'C' | 'C#/Db' | 'D' | 'D#/Eb' | 'E' | 'F' | 'F#/Gb' | 'G' | 'G#/Ab' | 'A' | 'A#/Bb' | 'B';

export interface UserProfile { name: string; createdAt: string; }
export interface AppSettings {
  dailyGoal: number;
  volume: number;
  darkMode: boolean;
  instrument: Instrument;
  language?: AppLanguage;
  dailyReminder: { enabled: boolean; time: string };
  weeklyReminder: { enabled: boolean; day: number; time: string };
}
export interface SessionSummary {
  id: string;
  type: SessionKind;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  questions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  firstAttemptCorrect: number;
  difficulty: Difficulty;
  exerciseBreakdown?: Partial<Record<ExerciseType, number>>;
  skillResults?: Partial<Record<ExerciseType, SkillResult>>;
  exerciseResults?: ExerciseResult[];
}
export interface ExerciseResult { id: string; type: ExerciseType; durationMs: number; incorrectAnswers: number; }
export interface SkillResult { questions: number; firstAttemptCorrect: number; incorrectAnswers: number; }
export interface SkillProgress { score: number; level: Difficulty; attempts: number; recentResults: boolean[]; updatedAt: string; }
export type SkillProgressMap = Record<ExerciseType, SkillProgress>;
export type FreePlayRecords = Record<ExerciseType, Record<Difficulty, number>>;
export interface AppData {
  version: 4;
  profile?: UserProfile;
  settings: AppSettings;
  sessions: SessionSummary[];
  skillProgress: SkillProgressMap;
  freePlayRecords: FreePlayRecords;
}

export interface ChoiceQuestion {
  id: string;
  type: ExerciseType;
  prompt: string;
  correctAnswer: string;
  options: string[];
  audio: AudioPayload;
  explanation: string;
  referencePitches?: PitchClass[];
}
export interface ChordQuestion extends ChoiceQuestion {
  root: PitchClass;
  quality: 'Major' | 'Minor' | 'Diminished' | 'Augmented';
}
export interface ProgressionChordQuestion extends ChoiceQuestion {
  chordSymbols: string[];
  optionsByChord: string[][];
}
export type ExerciseQuestion = ChoiceQuestion | ChordQuestion | ProgressionChordQuestion;
export type AnswerMode = 'pitch-keyboard' | 'four-choice';
export type ExerciseFlow = 'single-answer' | 'quality-then-root' | 'progression-sequence';
export interface ExerciseDefinition {
  id: ExerciseType;
  title: string;
  shortDescription: string;
  icon: string;
  difficulty: string;
  answerMode: AnswerMode;
  flow: ExerciseFlow;
  questionCount: number;
  distractorPolicy: 'adaptive-musical-proximity';
}
export interface AudioPayload {
  kind: 'note' | 'interval' | 'chord' | 'progression' | 'rhythm';
  notes: string[];
  duration?: number;
  rhythm?: number[];
}
export type ExerciseState = 'preparing' | 'playing' | 'waitingForAnswer' | 'correct' | 'incorrect' | 'completed';

export const PITCH_CLASSES: PitchClass[] = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];
export const EXERCISE_TYPES: ExerciseType[] = ['note', 'interval', 'harmonic-interval', 'chord', 'inversion', 'chord-symbol', 'progression', 'progression-chords', 'cadence', 'rhythm'];
export const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const levelForScore = (score: number): Difficulty => Math.max(1, Math.min(10, Math.ceil(score / 10))) as Difficulty;
export const defaultSkillProgress = (): SkillProgressMap => EXERCISE_TYPES.reduce((progress, type) => ({ ...progress, [type]: { score: 50, level: 5 as Difficulty, attempts: 0, recentResults: [], updatedAt: new Date(0).toISOString() } }), {} as SkillProgressMap);
export const defaultFreePlayRecords = (): FreePlayRecords => EXERCISE_TYPES.reduce((records, type) => ({ ...records, [type]: DIFFICULTIES.reduce((levels, level) => ({ ...levels, [level]: 0 }), {} as Record<Difficulty, number>) }), {} as FreePlayRecords);
export const DEFAULT_SETTINGS: AppSettings = {
  dailyGoal: 10, volume: -3.1, darkMode: false, instrument: 'piano',
  dailyReminder: { enabled: false, time: '19:00' },
  weeklyReminder: { enabled: false, day: 0, time: '18:00' },
};
