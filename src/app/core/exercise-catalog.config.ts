import { Difficulty, ExerciseDefinition, ExerciseType } from './models';

export type ContentScope = 'core' | 'extended';
export type DistractorSimilarity = 'distant' | 'similar';
export type ProgressionLengthRule = 3 | 4 | 'mixed';

/**
 * This is the single product configuration for exercises.
 *
 * To tune an existing exercise, edit its card below: presentation, number of
 * questions, answer flow, and every difficulty profile live here. A new type
 * still needs a generator in ExerciseEngineService and its localized strings,
 * but no page or session changes.
 *
 * Set `enabled: false` on an exercise card to hide it from Practice and Quick
 * Practice. Disabled exercise URLs are redirected back to Practice; existing
 * history and progress are retained.
 */
export interface ExerciseDifficultyConfiguration {
  /** Every level has a finite error allowance before the question is failed. */
  maxMistakesPerQuestion: number;
  contentScope: ContentScope;
  distractorSimilarity: DistractorSimilarity;
  choiceCount: number;
  /** Limits the ordered content pool for gradual musical complexity. */
  contentCount?: number;
  progressionLength?: ProgressionLengthRule;
  note?: {
    keyboardOptionCount: 2 | 4 | 6 | 8 | 12;
    octaveRange: readonly [3 | 4 | 5, 3 | 4 | 5];
    references: { count: 0 | 1 | 2; selection?: 'random' };
  };
}

export interface ExerciseConfiguration extends ExerciseDefinition {
  generator: ExerciseType;
  /** Omit for enabled; set to false to temporarily remove this exercise. */
  enabled?: boolean;
  levels: Record<Difficulty, ExerciseDifficultyConfiguration>;
}

export const defineLevels = <T extends ExerciseDifficultyConfiguration>(levels: Record<Difficulty, T>): Record<Difficulty, T> => levels;
const errors = (level: Difficulty): number => level === 1 ? 5 : level === 2 ? 4 : level <= 4 ? 3 : level <= 7 ? 2 : level <= 9 ? 1 : 0;
const level = (
  levelNumber: Difficulty,
  contentScope: ContentScope,
  distractorSimilarity: DistractorSimilarity,
  progressionLength?: ProgressionLengthRule,
  contentCount?: number,
): ExerciseDifficultyConfiguration => ({
  maxMistakesPerQuestion: errors(levelNumber),
  contentScope,
  distractorSimilarity,
  choiceCount: Math.min(4, Math.max(2, contentCount ?? 4)),
  contentCount,
  progressionLength,
});
const standardLevels = (progression = false): Record<Difficulty, ExerciseDifficultyConfiguration> => defineLevels({
  1: level(1, 'core', 'distant', progression ? 3 : undefined, 1), 2: level(2, 'core', 'distant', progression ? 3 : undefined, 2),
  3: level(3, 'core', 'distant', progression ? 3 : undefined, 3), 4: level(4, 'core', 'distant', progression ? 3 : undefined, 4),
  5: level(5, 'core', 'distant', progression ? 3 : undefined, 5), 6: level(6, 'extended', 'distant', progression ? 4 : undefined, 6),
  7: level(7, 'extended', 'distant', progression ? 4 : undefined, 7), 8: level(8, 'extended', 'similar', progression ? 4 : undefined, 8),
  9: level(9, 'extended', 'similar', progression ? 'mixed' : undefined, 9), 10: level(10, 'extended', 'similar', progression ? 'mixed' : undefined, 10),
});
const noteLevel = (levelNumber: Difficulty, keyboardOptionCount: 2 | 4 | 6 | 8 | 12, octaveRange: readonly [3 | 4 | 5, 3 | 4 | 5], referenceCount: 0 | 1 | 2): ExerciseDifficultyConfiguration => ({ ...level(levelNumber, 'extended', levelNumber >= 8 ? 'similar' : 'distant', undefined, levelNumber), choiceCount: keyboardOptionCount, note: { keyboardOptionCount, octaveRange, references: { count: referenceCount, ...(referenceCount ? { selection: 'random' as const } : {}) } } });
const noteLevels = defineLevels({
  1: noteLevel(1, 2, [3, 3], 2), 2: noteLevel(2, 4, [3, 3], 2), 3: noteLevel(3, 4, [3, 3], 2), 4: noteLevel(4, 6, [3, 3], 2), 5: noteLevel(5, 6, [3, 3], 2),
  6: noteLevel(6, 6, [3, 3], 1), 7: noteLevel(7, 8, [3, 3], 1), 8: noteLevel(8, 8, [3, 4], 1), 9: noteLevel(9, 12, [3, 4], 0), 10: noteLevel(10, 12, [3, 5], 0),
});
const introductory = standardLevels();
const harmonic = standardLevels();
const advanced = standardLevels();
const mixedProgressions = standardLevels(true);

export const EXERCISE_CATALOG: Record<ExerciseType, ExerciseConfiguration> = {
  progression: {
    id: 'progression',
    generator: 'progression',
    title: 'Identify progression',
    shortDescription:
      'Hear the complete progression and choose the complete chord sequence.',
    icon: '⌁',
    difficulty: 'Beginner',
    answerMode: 'four-choice',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: mixedProgressions,
  },
  'chord-symbol': {
    id: 'chord-symbol',
    generator: 'chord-symbol',
    title: 'Identify chord',
    shortDescription: 'Name one chord by its symbol: C, Bb, Cm or D7.',
    icon: '♮',
    difficulty: 'Beginner',
    answerMode: 'four-choice',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: introductory,
  },
  'progression-chords': {
    id: 'progression-chords',
    generator: 'progression-chords',
    title: 'Progression chords',
    shortDescription:
      'Listen to a progression, then identify each chord symbol.',
    icon: '⋮',
    difficulty: 'Easy',
    answerMode: 'four-choice',
    flow: 'progression-sequence',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: mixedProgressions,
    enabled: false,
  },
  note: {
    id: 'note',
    generator: 'note',
    title: 'Identify note',
    shortDescription: 'Recognize a single pitch class.',
    icon: '♪',
    difficulty: 'Beginner',
    answerMode: 'pitch-keyboard',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: noteLevels,
  },
  interval: {
    id: 'interval',
    generator: 'interval',
    title: 'Identify interval',
    shortDescription: 'Measure the space between notes.',
    icon: '↗',
    difficulty: 'Beginner',
    answerMode: 'four-choice',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: harmonic,
  },
  'harmonic-interval': {
    id: 'harmonic-interval',
    generator: 'harmonic-interval',
    title: 'Harmonic intervals',
    shortDescription: 'Recognize two notes played together.',
    icon: '↕',
    difficulty: 'Easy',
    answerMode: 'four-choice',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: harmonic,
  },
  chord: {
    id: 'chord',
    generator: 'chord',
    title: 'Chord quality + root',
    shortDescription: 'Identify the quality first, then its root.',
    icon: '♬',
    difficulty: 'Easy',
    answerMode: 'four-choice',
    flow: 'quality-then-root',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: introductory,
  },
  inversion: {
    id: 'inversion',
    generator: 'inversion',
    title: 'Chord inversions',
    shortDescription: 'Hear which chord tone sits in the bass.',
    icon: '↺',
    difficulty: 'Easy',
    answerMode: 'four-choice',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: advanced,
    enabled: false,
  },
  cadence: {
    id: 'cadence',
    generator: 'cadence',
    title: 'Cadences',
    shortDescription: 'Recognize how a short harmonic phrase resolves.',
    icon: '⌟',
    difficulty: 'Easy',
    answerMode: 'four-choice',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: advanced,
    enabled: false,
  },
  rhythm: {
    id: 'rhythm',
    generator: 'rhythm',
    title: 'Rhythm patterns',
    shortDescription: 'Identify the timing shape of a short pulse.',
    icon: '◌',
    difficulty: 'Easy',
    answerMode: 'four-choice',
    flow: 'single-answer',
    questionCount: 5,
    distractorPolicy: 'adaptive-musical-proximity',
    levels: advanced,
    enabled: false,
  },
};

/** Musical option pools used by the generators above. Edit these to add or remove content. */
export const EXERCISE_CONTENT = {
  noteCorePitches: [0, 2, 4, 5, 7, 9, 11],
  intervals: [
    { key: 'minorThird', semitones: 3 },
    { key: 'majorThird', semitones: 4 },
    { key: 'perfectFourth', semitones: 5 },
    { key: 'perfectFifth', semitones: 7 },
    { key: 'octave', semitones: 12 },
    { key: 'majorSecond', semitones: 2 },
    { key: 'minorSixth', semitones: 8 },
    { key: 'majorSixth', semitones: 9 },
  ],
  progressions: [
    ['I', 'V', 'vi', 'IV'],
    ['I', 'vi', 'IV', 'V'],
    ['vi', 'IV', 'I', 'V'],
    ['I', 'IV', 'V', 'I'],
    ['ii', 'V7', 'I'],
    ['I', 'IV', 'V7'],
    ['vi', 'ii', 'V7'],
    ['I', 'vi', 'IV'],
  ],
  keys: ['C', 'Bb', 'D', 'F', 'G', 'A', 'E'],
  chordRoots: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  inversionQualities: ['7', 'm7'],
  cadences: [
    { key: 'cadenceAuthentic', degrees: ['V7', 'I'] },
    { key: 'cadenceImperfect', degrees: ['V', 'I'] },
    { key: 'cadencePlagal', degrees: ['IV', 'I'] },
    { key: 'cadenceDeceptive', degrees: ['V', 'vi'] },
    { key: 'cadenceHalf', degrees: ['ii', 'V'] },
  ],
  rhythms: [
    { key: 'rhythmSteady', pattern: [0, 0.5, 1, 1.5] },
    { key: 'rhythmSyncopated', pattern: [0, 0.75, 1, 1.75] },
    { key: 'rhythmTriplet', pattern: [0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3] },
    { key: 'rhythmDotted', pattern: [0, 0.75, 1.5] },
    { key: 'rhythmAnticipated', pattern: [0, 0.5, 1.25, 1.5] },
    { key: 'rhythmBackbeat', pattern: [0.5, 1.5] },
  ],
};

export const EXERCISE_DEFINITIONS: readonly ExerciseDefinition[] =
  Object.values(EXERCISE_CATALOG);
export const exerciseConfiguration = (
  id: ExerciseType,
): ExerciseConfiguration => EXERCISE_CATALOG[id];
export const isExerciseEnabled = (id: ExerciseType): boolean =>
  EXERCISE_CATALOG[id].enabled !== false;
export const enabledExerciseTypes = (): ExerciseType[] =>
  (Object.keys(EXERCISE_CATALOG) as ExerciseType[]).filter(isExerciseEnabled);
export const exerciseTranslationKey = (id: ExerciseType): string =>
  ({
    note: 'Note',
    interval: 'Interval',
    'harmonic-interval': 'HarmonicInterval',
    chord: 'Chord',
    inversion: 'Inversion',
    'chord-symbol': 'ChordSymbol',
    progression: 'Progression',
    'progression-chords': 'ProgressionChords',
    cadence: 'Cadence',
    rhythm: 'Rhythm',
  })[id];
