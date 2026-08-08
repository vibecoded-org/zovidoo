import { ExerciseDefinition, ExerciseType } from './models';

export const EXERCISE_DEFINITIONS: readonly ExerciseDefinition[] = [
  { id: 'progression', title: 'Identify progression', shortDescription: 'Hear the complete progression and choose the complete chord sequence.', icon: '⌁', difficulty: 'Beginner', answerMode: 'four-choice', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'chord-symbol', title: 'Identify chord', shortDescription: 'Name one chord by its symbol: C, Bb, Cm or D7.', icon: '♮', difficulty: 'Beginner', answerMode: 'four-choice', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'progression-chords', title: 'Progression chords', shortDescription: 'Listen to a progression, then identify each chord symbol.', icon: '⋮', difficulty: 'Easy', answerMode: 'four-choice', flow: 'progression-sequence', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'note', title: 'Identify note', shortDescription: 'Recognize a single pitch class.', icon: '♪', difficulty: 'Beginner', answerMode: 'pitch-keyboard', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'interval', title: 'Identify interval', shortDescription: 'Measure the space between notes.', icon: '↗', difficulty: 'Beginner', answerMode: 'four-choice', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'harmonic-interval', title: 'Harmonic intervals', shortDescription: 'Recognize two notes played together.', icon: '↕', difficulty: 'Easy', answerMode: 'four-choice', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'chord', title: 'Chord quality + root', shortDescription: 'Identify the quality first, then its root.', icon: '♬', difficulty: 'Easy', answerMode: 'four-choice', flow: 'quality-then-root', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'inversion', title: 'Chord inversions', shortDescription: 'Hear which chord tone sits in the bass.', icon: '↺', difficulty: 'Easy', answerMode: 'four-choice', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'cadence', title: 'Cadences', shortDescription: 'Recognize how a short harmonic phrase resolves.', icon: '⌟', difficulty: 'Easy', answerMode: 'four-choice', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
  { id: 'rhythm', title: 'Rhythm patterns', shortDescription: 'Identify the timing shape of a short pulse.', icon: '◌', difficulty: 'Easy', answerMode: 'four-choice', flow: 'single-answer', questionCount: 5, distractorPolicy: 'adaptive-musical-proximity' },
];

export const exerciseDefinition = (id: ExerciseType): ExerciseDefinition => {
  const definition = EXERCISE_DEFINITIONS.find(item => item.id === id);
  if (!definition) throw new Error(`Unknown exercise: ${id}`);
  return definition;
};
