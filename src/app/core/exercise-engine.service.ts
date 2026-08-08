import { Injectable, inject } from '@angular/core';
import { ChordQuestion, ChoiceQuestion, Difficulty, ExerciseQuestion, ExerciseType, PITCH_CLASSES, PitchClass, ProgressionChordQuestion } from './models';
import { MusicTheoryService } from './music-theory.service';
import { TranslationService } from './translation.service';

const intervals = [{ key: 'minorThird', semitones: 3 }, { key: 'majorThird', semitones: 4 }, { key: 'perfectFourth', semitones: 5 }, { key: 'perfectFifth', semitones: 7 }, { key: 'octave', semitones: 12 }, { key: 'majorSecond', semitones: 2 }, { key: 'minorSixth', semitones: 8 }, { key: 'majorSixth', semitones: 9 }];
const progressions = [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['vi', 'IV', 'I', 'V'], ['I', 'IV', 'V', 'I'], ['ii', 'V7', 'I'], ['I', 'IV', 'V7'], ['vi', 'ii', 'V7'], ['I', 'vi', 'IV']];
const keys = ['C', 'Bb', 'D', 'F', 'G', 'A', 'E'];
const chordRoots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const cadences = [
  { key: 'cadenceAuthentic', degrees: ['V7', 'I'] },
  { key: 'cadencePlagal', degrees: ['IV', 'I'] },
  { key: 'cadenceDeceptive', degrees: ['V', 'vi'] },
  { key: 'cadenceHalf', degrees: ['ii', 'V'] },
];
const rhythms = [
  { key: 'rhythmSteady', pattern: [0, .5, 1, 1.5] },
  { key: 'rhythmSyncopated', pattern: [0, .75, 1, 1.75] },
  { key: 'rhythmTriplet', pattern: [0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3] },
  { key: 'rhythmDotted', pattern: [0, .75, 1.5] },
];
const pick = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];
const choices = <T>(items: T[], count: number, random: () => number): T[] => [...items].sort(() => random() - .5).slice(0, count);
const shuffle = <T>(items: T[], random: () => number): T[] => [...items].sort(() => random() - .5);
const symbol = (root: string, quality: string): string => `${root}${quality}`;
export interface ExerciseGenerationOptions { progressionLength?: 3 | 4; }

@Injectable({ providedIn: 'root' })
export class ExerciseEngineService {
  private readonly theory = inject(MusicTheoryService);
  private readonly i18n = inject(TranslationService);

  generate(type: ExerciseType, difficulty: Difficulty = 1, random = Math.random, options: ExerciseGenerationOptions = {}): ExerciseQuestion {
    switch (type) { case 'note': return this.note(random, difficulty); case 'interval': return this.interval(random, difficulty); case 'harmonic-interval': return this.harmonicInterval(random, difficulty); case 'chord': return this.chordQuality(random); case 'inversion': return this.inversion(random); case 'chord-symbol': return this.chordSymbol(random, difficulty); case 'progression-chords': return this.progressionChords(random, difficulty, options); case 'progression': return this.progression(random, difficulty, options); case 'cadence': return this.cadence(random, difficulty); case 'rhythm': return this.rhythm(random, difficulty); }
  }
  private note(random: () => number, difficulty: Difficulty): ChoiceQuestion {
    const pool = difficulty === 1 ? [0, 2, 4, 5, 7, 9, 11] : PITCH_CLASSES.map((_, index) => index); const pitch = pick(pool, random); const octave = 3 + Math.floor(random() * 3); const answer = PITCH_CLASSES[pitch];
    return { id: crypto.randomUUID(), type: 'note', prompt: this.t('notePrompt'), correctAnswer: answer, options: PITCH_CLASSES, audio: { kind: 'note', notes: [this.theory.noteAt(pitch, octave)] }, explanation: this.t('thatWas', { answer }) };
  }
  private interval(random: () => number, difficulty: Difficulty): ChoiceQuestion {
    const pool = difficulty <= 1 ? intervals.slice(0, 5) : intervals; const target = pick(pool, random); const label = this.t(target.key); const labels = pool.map(item => this.t(item.key)); const start = 48 + Math.floor(random() * 12); const options = shuffle([label, ...this.intervalDistractors(label, labels, difficulty)], random);
    return { id: crypto.randomUUID(), type: 'interval', prompt: this.t('intervalPrompt'), correctAnswer: label, options, audio: { kind: 'interval', notes: [this.theory.noteAt(start % 12, Math.floor(start / 12)), this.theory.noteAt((start + target.semitones) % 12, Math.floor((start + target.semitones) / 12))] }, explanation: this.t('intervalExplanation', { interval: label, semitones: target.semitones }) };
  }
  private harmonicInterval(random: () => number, difficulty: Difficulty): ChoiceQuestion {
    const pool = difficulty <= 1 ? intervals.slice(0, 5) : intervals; const target = pick(pool, random); const label = this.t(target.key); const labels = pool.map(item => this.t(item.key)); const start = 48 + Math.floor(random() * 12); const options = shuffle([label, ...this.intervalDistractors(label, labels, difficulty)], random);
    return { id: crypto.randomUUID(), type: 'harmonic-interval', prompt: this.t('harmonicIntervalPrompt'), correctAnswer: label, options, audio: { kind: 'chord', notes: [this.theory.noteAt(start % 12, Math.floor(start / 12)), this.theory.noteAt((start + target.semitones) % 12, Math.floor((start + target.semitones) / 12))] }, explanation: this.t('thatWas', { answer: label }) };
  }
  private chordQuality(random: () => number): ChordQuestion {
    const qualities: ChordQuestion['quality'][] = ['Major', 'Minor', 'Diminished', 'Augmented']; const quality = pick(qualities, random); const root = pick(PITCH_CLASSES, random);
    const displayedQuality = this.quality(quality);
    return { id: crypto.randomUUID(), type: 'chord', prompt: this.t('chordQualityPrompt'), correctAnswer: displayedQuality, options: shuffle(qualities.map(item => this.quality(item)), random), root, quality, audio: { kind: 'chord', notes: this.theory.chordNotes(root, quality) }, explanation: this.t('chordExplanation', { root, quality: displayedQuality.toLowerCase() }) };
  }
  private inversion(random: () => number): ChoiceQuestion {
    const root = pick(PITCH_CLASSES, random); const quality = pick(['Major', 'Minor'] as const, random); const index = Math.floor(random() * 3); const labels = ['rootPosition', 'firstInversion', 'secondInversion']; const correct = this.t(labels[index]);
    return { id: crypto.randomUUID(), type: 'inversion', prompt: this.t('inversionPrompt'), correctAnswer: correct, options: shuffle(labels.map(label => this.t(label)), random), audio: { kind: 'chord', notes: this.theory.invert(this.theory.chordNotes(root, quality), index) }, explanation: this.t('thatWas', { answer: correct }) };
  }
  private chordSymbol(random: () => number, difficulty: Difficulty): ChoiceQuestion {
    const qualities = ['', 'm', '7']; const correct = symbol(pick(chordRoots, random), pick(qualities, random));
    return { id: crypto.randomUUID(), type: 'chord-symbol', prompt: this.t('chordSymbolPrompt'), correctAnswer: correct, options: shuffle([correct, ...this.chordSymbolDistractors(correct, difficulty)], random), audio: { kind: 'chord', notes: this.theory.chordSymbolNotes(correct) }, explanation: this.t('thatWas', { answer: correct }) };
  }
  private progression(random: () => number, difficulty: Difficulty, options: ExerciseGenerationOptions): ChoiceQuestion {
    const key = pick(keys, random); const matching = progressions.filter(item => item.length === (options.progressionLength ?? pick([3, 4] as const, random))); const target = pick(matching, random); const chordSymbols = this.theory.progressionSymbols(key, target); const correct = chordSymbols.join(' – ');
    const optionsList = shuffle([correct, ...this.progressionDistractors(target, matching, key, difficulty)], random);
    return { id: crypto.randomUUID(), type: 'progression', prompt: this.t('progressionPrompt'), correctAnswer: correct, options: optionsList, audio: { kind: 'progression', notes: chordSymbols.map(item => this.theory.chordSymbolNotes(item).join(',')) }, explanation: this.t('progressionExplanation', { progression: chordSymbols.join(' → ') }) };
  }
  private progressionChords(random: () => number, difficulty: Difficulty, config: ExerciseGenerationOptions): ProgressionChordQuestion {
    const key = pick(keys, random); const matching = progressions.filter(item => item.length === (config.progressionLength ?? pick([3, 4] as const, random))); const chordSymbols = this.theory.progressionSymbols(key, pick(matching, random)); const correct = chordSymbols[0];
    const optionsByChord = chordSymbols.map(chord => shuffle([chord, ...this.chordSymbolDistractors(chord, difficulty)], random));
    return { id: crypto.randomUUID(), type: 'progression-chords', prompt: this.t('progressionChordsPrompt'), correctAnswer: correct, options: optionsByChord[0], chordSymbols, optionsByChord, audio: { kind: 'progression', notes: chordSymbols.map(item => this.theory.chordSymbolNotes(item).join(',')) }, explanation: this.t('progressionExplanation', { progression: chordSymbols.join(' → ') }) };
  }
  private cadence(random: () => number, difficulty: Difficulty): ChoiceQuestion {
    const target = pick(cadences, random); const key = pick(keys, random); const options = difficulty >= 3 ? cadences : shuffle(cadences, random);
    return { id: crypto.randomUUID(), type: 'cadence', prompt: this.t('cadencePrompt'), correctAnswer: this.t(target.key), options: shuffle(options.map(item => this.t(item.key)), random), audio: { kind: 'progression', notes: this.theory.progressionSymbols(key, target.degrees).map(item => this.theory.chordSymbolNotes(item).join(',')) }, explanation: this.t('thatWas', { answer: this.t(target.key) }) };
  }
  private rhythm(random: () => number, difficulty: Difficulty): ChoiceQuestion {
    const target = pick(rhythms, random); const candidates = difficulty >= 3 ? rhythms : shuffle(rhythms, random);
    return { id: crypto.randomUUID(), type: 'rhythm', prompt: this.t('rhythmPrompt'), correctAnswer: this.t(target.key), options: shuffle(candidates.map(item => this.t(item.key)), random), audio: { kind: 'rhythm', notes: ['C5'], rhythm: target.pattern }, explanation: this.t('thatWas', { answer: this.t(target.key) }) };
  }
  private intervalDistractors(answer: string, labels: string[], difficulty: Difficulty): string[] {
    const index = labels.indexOf(answer); const ranked = labels.filter(label => label !== answer).sort((a, b) => Math.abs(labels.indexOf(a) - index) - Math.abs(labels.indexOf(b) - index));
    return difficulty >= 3 ? ranked.slice(0, 3) : ranked.slice(-3);
  }
  private chordSymbolDistractors(answer: string, difficulty: Difficulty): string[] {
    const match = /^([A-G](?:b|#)?)(m|7)?$/.exec(answer); if (!match) return [];
    const root = match[1]; const quality = match[2] ?? ''; const index = chordRoots.indexOf(root); const offsets = difficulty >= 3 ? [1, -1, 2] : [4, -4, 6];
    return offsets.map(offset => symbol(chordRoots[(index + offset + chordRoots.length) % chordRoots.length], quality));
  }
  private progressionDistractors(target: string[], pool: string[][], key: string, difficulty: Difficulty): string[] {
    const differences = (candidate: string[]): number => candidate.reduce((count, degree, index) => count + Number(degree !== target[index]), 0);
    const ranked = pool.filter(candidate => candidate !== target).sort((a, b) => differences(a) - differences(b));
    const selected = difficulty >= 3 ? ranked.slice(0, 3) : ranked.slice(-3);
    return selected.map(item => this.theory.progressionSymbols(key, item).join(' – '));
  }
  private t(key: string, params: Record<string, string | number> = {}): string { return this.i18n?.t(key, params) ?? ({ minorThird: 'Minor 3rd', majorThird: 'Major 3rd', perfectFourth: 'Perfect 4th', perfectFifth: 'Perfect 5th', octave: 'Octave', majorSecond: 'Major 2nd', minorSixth: 'Minor 6th', majorSixth: 'Major 6th', notePrompt: 'Which note did you hear?', intervalPrompt: 'Which interval did you hear?', chordQualityPrompt: 'What chord quality did you hear?', chordSymbolPrompt: 'Which chord did you hear?', progressionPrompt: 'Which chord progression did you hear?', progressionChordsPrompt: 'Identify each chord in the progression.', major: 'Major', minor: 'Minor', diminished: 'Diminished', augmented: 'Augmented' })[key] ?? key; }
  private quality(quality: ChordQuestion['quality']): string { return this.t(({ Major: 'major', Minor: 'minor', Diminished: 'diminished', Augmented: 'augmented' })[quality]); }
}
