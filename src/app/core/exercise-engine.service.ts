import { Injectable, inject } from '@angular/core';
import { ChordQuestion, ChoiceQuestion, Difficulty, ExerciseQuestion, ExerciseType, PITCH_CLASSES, PitchClass, ProgressionChordQuestion } from './models';
import { MusicTheoryService } from './music-theory.service';
import { TranslationService } from './translation.service';
import { EXERCISE_CONTENT, ExerciseDifficultyConfiguration, exerciseConfiguration } from './exercise-catalog.config';
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
    const configuration = exerciseConfiguration(type); const profile = configuration.levels[difficulty];
    switch (configuration.generator) { case 'note': return this.note(random, profile); case 'interval': return this.interval(random, profile); case 'harmonic-interval': return this.harmonicInterval(random, profile); case 'chord': return this.chordQuality(random, profile); case 'inversion': return this.inversion(random, profile); case 'chord-symbol': return this.chordSymbol(random, profile); case 'progression-chords': return this.progressionChords(random, profile, options); case 'progression': return this.progression(random, profile, options); case 'cadence': return this.cadence(random, profile); case 'rhythm': return this.rhythm(random, profile); }
  }
  private note(random: () => number, profile: ExerciseDifficultyConfiguration): ChoiceQuestion {
    const note = profile.note; const pool = PITCH_CLASSES.map((_, index) => index); const pitch = pick(pool, random); const [lowestOctave, highestOctave] = note?.octaveRange ?? [3, 5]; const octave = lowestOctave + Math.floor(random() * (highestOctave - lowestOctave + 1)); const answer = PITCH_CLASSES[pitch];
    const optionCount = note?.keyboardOptionCount ?? 12; const options = shuffle([answer, ...choices(PITCH_CLASSES.filter(item => item !== answer), optionCount - 1, random)], random); const referencePitches = note?.references.count ? choices(options, note.references.count, random) : [];
    const notes = [...referencePitches.map(reference => this.theory.noteAt(PITCH_CLASSES.indexOf(reference), octave)), this.theory.noteAt(pitch, octave)];
    return { id: crypto.randomUUID(), type: 'note', prompt: this.t('notePrompt'), correctAnswer: answer, options, referencePitches: referencePitches.length ? referencePitches : undefined, audio: referencePitches.length ? { kind: 'progression', notes } : { kind: 'note', notes }, explanation: this.t('thatWas', { answer }) };
  }
  private interval(random: () => number, profile: ExerciseDifficultyConfiguration): ChoiceQuestion {
    const source = profile.contentScope === 'core' ? EXERCISE_CONTENT.intervals.slice(0, 5) : EXERCISE_CONTENT.intervals; const pool = source.slice(0, Math.max(profile.choiceCount, Math.min(source.length, profile.contentCount ?? source.length))); const target = pick(pool, random); const label = this.t(target.key); const labels = pool.map(item => this.t(item.key)); const start = 48 + Math.floor(random() * 12); const options = shuffle([label, ...this.intervalDistractors(label, labels, profile)], random);
    return { id: crypto.randomUUID(), type: 'interval', prompt: this.t('intervalPrompt'), correctAnswer: label, options, audio: { kind: 'interval', notes: [this.theory.noteAt(start % 12, Math.floor(start / 12)), this.theory.noteAt((start + target.semitones) % 12, Math.floor((start + target.semitones) / 12))] }, explanation: this.t('intervalExplanation', { interval: label, semitones: target.semitones }) };
  }
  private harmonicInterval(random: () => number, profile: ExerciseDifficultyConfiguration): ChoiceQuestion {
    const source = profile.contentScope === 'core' ? EXERCISE_CONTENT.intervals.slice(0, 5) : EXERCISE_CONTENT.intervals; const pool = source.slice(0, Math.max(profile.choiceCount, Math.min(source.length, profile.contentCount ?? source.length))); const target = pick(pool, random); const label = this.t(target.key); const labels = pool.map(item => this.t(item.key)); const start = 48 + Math.floor(random() * 12); const options = shuffle([label, ...this.intervalDistractors(label, labels, profile)], random);
    return { id: crypto.randomUUID(), type: 'harmonic-interval', prompt: this.t('harmonicIntervalPrompt'), correctAnswer: label, options, audio: { kind: 'chord', notes: [this.theory.noteAt(start % 12, Math.floor(start / 12)), this.theory.noteAt((start + target.semitones) % 12, Math.floor((start + target.semitones) / 12))] }, explanation: this.t('thatWas', { answer: label }) };
  }
  private chordQuality(random: () => number, profile: ExerciseDifficultyConfiguration): ChordQuestion {
    const allQualities: ChordQuestion['quality'][] = ['Major', 'Minor', 'Diminished', 'Augmented']; const qualities = allQualities.slice(0, Math.max(2, Math.min(allQualities.length, profile.contentCount ?? allQualities.length))); const quality = pick(qualities, random); const root = pick(profile.contentScope === 'core' ? PITCH_CLASSES.slice(0, 5) : PITCH_CLASSES, random);
    const displayedQuality = this.quality(quality);
    return { id: crypto.randomUUID(), type: 'chord', prompt: this.t('chordQualityPrompt'), correctAnswer: displayedQuality, options: this.optionsWithCorrect(displayedQuality, qualities.map(item => this.quality(item)), profile, random), root, quality, audio: { kind: 'chord', notes: this.theory.chordNotes(root, quality) }, explanation: this.t('chordExplanation', { root, quality: displayedQuality.toLowerCase() }) };
  }
  private inversion(random: () => number, profile: ExerciseDifficultyConfiguration): ChoiceQuestion {
    const root = pick(profile.contentScope === 'core' ? PITCH_CLASSES.slice(0, 5) : PITCH_CLASSES, random); const qualities = EXERCISE_CONTENT.inversionQualities.slice(0, profile.contentScope === 'core' ? 1 : EXERCISE_CONTENT.inversionQualities.length); const quality = pick(qualities, random); const labels = ['rootPosition', 'firstInversion', 'secondInversion', 'thirdInversion']; const availableLabels = labels.slice(0, Math.max(profile.choiceCount, Math.min(labels.length, profile.contentCount ?? labels.length))); const index = labels.indexOf(pick(availableLabels, random)); const correct = this.t(labels[index]);
    return { id: crypto.randomUUID(), type: 'inversion', prompt: this.t('inversionPrompt'), correctAnswer: correct, options: this.optionsWithCorrect(correct, availableLabels.map(label => this.t(label)), profile, random), audio: { kind: 'chord', notes: this.theory.invert(this.theory.chordSymbolNotes(`${root.split('/')[0]}${quality}`), index) }, explanation: this.t('thatWas', { answer: correct }) };
  }
  private chordSymbol(random: () => number, profile: ExerciseDifficultyConfiguration): ChoiceQuestion {
    const qualities = ['', 'm', '7'].slice(0, profile.contentScope === 'core' ? 2 : 3); const roots = profile.contentScope === 'core' ? EXERCISE_CONTENT.chordRoots.slice(0, 5) : EXERCISE_CONTENT.chordRoots; const correct = symbol(pick(roots, random), pick(qualities, random));
    return { id: crypto.randomUUID(), type: 'chord-symbol', prompt: this.t('chordSymbolPrompt'), correctAnswer: correct, options: shuffle([correct, ...this.chordSymbolDistractors(correct, profile)], random), audio: { kind: 'chord', notes: this.theory.chordSymbolNotes(correct) }, explanation: this.t('thatWas', { answer: correct }) };
  }
  private progression(random: () => number, profile: ExerciseDifficultyConfiguration, options: ExerciseGenerationOptions): ChoiceQuestion {
    const key = pick(profile.contentScope === 'core' ? EXERCISE_CONTENT.keys.slice(0, 3) : EXERCISE_CONTENT.keys, random); const allMatching = EXERCISE_CONTENT.progressions.filter(item => item.length === (options.progressionLength ?? this.progressionLength(profile, random))); const matching = allMatching.slice(0, Math.max(profile.choiceCount, Math.min(allMatching.length, profile.contentCount ?? allMatching.length))); const target = pick(matching, random); const chordSymbols = this.theory.progressionSymbols(key, target); const correct = chordSymbols.join(' – ');
    const optionsList = shuffle([correct, ...this.progressionDistractors(target, matching, key, profile)], random);
    return { id: crypto.randomUUID(), type: 'progression', prompt: this.t('progressionPrompt'), correctAnswer: correct, options: optionsList, audio: { kind: 'progression', notes: chordSymbols.map(item => this.theory.chordSymbolNotes(item).join(',')) }, explanation: this.t('progressionExplanation', { progression: chordSymbols.join(' → ') }) };
  }
  private progressionChords(random: () => number, profile: ExerciseDifficultyConfiguration, config: ExerciseGenerationOptions): ProgressionChordQuestion {
    const key = pick(profile.contentScope === 'core' ? EXERCISE_CONTENT.keys.slice(0, 3) : EXERCISE_CONTENT.keys, random); const allMatching = EXERCISE_CONTENT.progressions.filter(item => item.length === (config.progressionLength ?? this.progressionLength(profile, random))); const matching = allMatching.slice(0, Math.max(profile.choiceCount, Math.min(allMatching.length, profile.contentCount ?? allMatching.length))); const chordSymbols = this.theory.progressionSymbols(key, pick(matching, random)); const correct = chordSymbols[0];
    const optionsByChord = chordSymbols.map(chord => shuffle([chord, ...this.chordSymbolDistractors(chord, profile)], random));
    return { id: crypto.randomUUID(), type: 'progression-chords', prompt: this.t('progressionChordsPrompt'), correctAnswer: correct, options: optionsByChord[0], chordSymbols, optionsByChord, audio: { kind: 'progression', notes: chordSymbols.map(item => this.theory.chordSymbolNotes(item).join(',')) }, explanation: this.t('progressionExplanation', { progression: chordSymbols.join(' → ') }) };
  }
  private cadence(random: () => number, profile: ExerciseDifficultyConfiguration): ChoiceQuestion {
    const pool = EXERCISE_CONTENT.cadences.slice(0, Math.max(profile.choiceCount, Math.min(EXERCISE_CONTENT.cadences.length, profile.contentCount ?? EXERCISE_CONTENT.cadences.length))); const target = pick(pool, random); const key = pick(profile.contentScope === 'core' ? EXERCISE_CONTENT.keys.slice(0, 3) : EXERCISE_CONTENT.keys, random); const options = this.adaptiveOptions(target, pool, candidate => this.cadenceDistance(target.degrees, candidate.degrees), profile, random);
    return { id: crypto.randomUUID(), type: 'cadence', prompt: this.t('cadencePrompt'), correctAnswer: this.t(target.key), options: shuffle(options.map(item => this.t(item.key)), random), audio: { kind: 'progression', notes: this.theory.progressionSymbols(key, target.degrees).map(item => this.theory.chordSymbolNotes(item).join(',')) }, explanation: this.t('thatWas', { answer: this.t(target.key) }) };
  }
  private rhythm(random: () => number, profile: ExerciseDifficultyConfiguration): ChoiceQuestion {
    const pool = EXERCISE_CONTENT.rhythms.slice(0, Math.max(profile.choiceCount, Math.min(EXERCISE_CONTENT.rhythms.length, profile.contentCount ?? EXERCISE_CONTENT.rhythms.length))); const target = pick(pool, random); const candidates = this.adaptiveOptions(target, pool, candidate => this.rhythmDistance(target.pattern, candidate.pattern), profile, random);
    return { id: crypto.randomUUID(), type: 'rhythm', prompt: this.t('rhythmPrompt'), correctAnswer: this.t(target.key), options: shuffle(candidates.map(item => this.t(item.key)), random), audio: { kind: 'rhythm', notes: ['C5'], rhythm: target.pattern }, explanation: this.t('thatWas', { answer: this.t(target.key) }) };
  }
  private intervalDistractors(answer: string, labels: string[], profile: ExerciseDifficultyConfiguration): string[] {
    const index = labels.indexOf(answer); const ranked = labels.filter(label => label !== answer).sort((a, b) => Math.abs(labels.indexOf(a) - index) - Math.abs(labels.indexOf(b) - index));
    return profile.distractorSimilarity === 'similar' ? ranked.slice(0, profile.choiceCount - 1) : ranked.slice(-(profile.choiceCount - 1));
  }
  private chordSymbolDistractors(answer: string, profile: ExerciseDifficultyConfiguration): string[] {
    const match = /^([A-G](?:b|#)?)(m|7)?$/.exec(answer); if (!match) return [];
    const root = match[1]; const quality = match[2] ?? ''; const index = EXERCISE_CONTENT.chordRoots.indexOf(root); const offsets = profile.distractorSimilarity === 'similar' ? [1, -1, 2, -2] : [4, -4, 6, -6];
    return offsets.slice(0, profile.choiceCount - 1).map(offset => symbol(EXERCISE_CONTENT.chordRoots[(index + offset + EXERCISE_CONTENT.chordRoots.length) % EXERCISE_CONTENT.chordRoots.length], quality));
  }
  private progressionDistractors(target: string[], pool: string[][], key: string, profile: ExerciseDifficultyConfiguration): string[] {
    const differences = (candidate: string[]): number => candidate.reduce((count, degree, index) => count + Number(degree !== target[index]), 0);
    const ranked = pool.filter(candidate => candidate !== target).sort((a, b) => differences(a) - differences(b));
    const selected = profile.distractorSimilarity === 'similar' ? ranked.slice(0, profile.choiceCount - 1) : ranked.slice(-(profile.choiceCount - 1));
    return selected.map(item => this.theory.progressionSymbols(key, item).join(' – '));
  }
  private adaptiveOptions<T>(target: T, pool: readonly T[], distance: (candidate: T) => number, profile: ExerciseDifficultyConfiguration, random: () => number): T[] { const ranked = pool.filter(candidate => candidate !== target).sort((a, b) => distance(a) - distance(b)); const distractors = profile.distractorSimilarity === 'similar' ? ranked.slice(0, profile.choiceCount - 1) : ranked.slice(-(profile.choiceCount - 1)); return shuffle([target, ...distractors], random); }
  private optionsWithCorrect<T>(correct: T, candidates: readonly T[], profile: ExerciseDifficultyConfiguration, random: () => number): T[] { const distractors = shuffle(candidates.filter(candidate => candidate !== correct), random).slice(0, profile.choiceCount - 1); return shuffle([correct, ...distractors], random); }
  private cadenceDistance(target: string[], candidate: string[]): number { return Math.abs(target.length - candidate.length) + target.reduce((distance, degree, index) => distance + Number(degree !== candidate[index]), 0); }
  private rhythmDistance(target: number[], candidate: number[]): number { const shared = Math.min(target.length, candidate.length); const timing = Array.from({ length: shared }, (_, index) => Math.abs(target[index] - candidate[index])).reduce((sum, value) => sum + value, 0); return Math.abs(target.length - candidate.length) + timing; }
  private progressionLength(profile: ExerciseDifficultyConfiguration, random: () => number): 3 | 4 { return profile.progressionLength === 'mixed' || !profile.progressionLength ? pick([3, 4] as const, random) : profile.progressionLength; }
  private t(key: string, params: Record<string, string | number> = {}): string { return this.i18n?.t(key, params) ?? ({ minorThird: 'Minor 3rd', majorThird: 'Major 3rd', perfectFourth: 'Perfect 4th', perfectFifth: 'Perfect 5th', octave: 'Octave', majorSecond: 'Major 2nd', minorSixth: 'Minor 6th', majorSixth: 'Major 6th', notePrompt: 'Which note did you hear?', intervalPrompt: 'Which interval did you hear?', chordQualityPrompt: 'What chord quality did you hear?', chordSymbolPrompt: 'Which chord did you hear?', progressionPrompt: 'Which chord progression did you hear?', progressionChordsPrompt: 'Identify each chord in the progression.', major: 'Major', minor: 'Minor', diminished: 'Diminished', augmented: 'Augmented' })[key] ?? key; }
  private quality(quality: ChordQuestion['quality']): string { return this.t(({ Major: 'major', Minor: 'minor', Diminished: 'diminished', Augmented: 'augmented' })[quality]); }
}
