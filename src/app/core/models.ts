export type ExerciseType = 'note' | 'interval' | 'chord' | 'chord-symbol' | 'progression' | 'progression-chords';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type AppLanguage = 'en' | 'es' | 'pt-BR';
export type Instrument = 'piano' | 'acoustic-guitar' | 'electric-piano' | 'organ' | 'vibraphone' | 'warm-pad' | 'marimba' | 'random';
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
  type: ExerciseType;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  questions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  firstAttemptCorrect: number;
  difficulty: Difficulty;
}
export interface AppData {
  version: 1;
  profile?: UserProfile;
  settings: AppSettings;
  sessions: SessionSummary[];
}

export interface ChoiceQuestion {
  id: string;
  type: ExerciseType;
  prompt: string;
  correctAnswer: string;
  options: string[];
  audio: AudioPayload;
  explanation: string;
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
  kind: 'note' | 'interval' | 'chord' | 'progression';
  notes: string[];
  duration?: number;
}
export type ExerciseState = 'preparing' | 'playing' | 'waitingForAnswer' | 'correct' | 'incorrect' | 'completed';

export const PITCH_CLASSES: PitchClass[] = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];
export const DEFAULT_SETTINGS: AppSettings = {
  dailyGoal: 10, volume: -8, darkMode: false, instrument: 'piano',
  dailyReminder: { enabled: false, time: '19:00' },
  weeklyReminder: { enabled: false, day: 0, time: '18:00' },
};
