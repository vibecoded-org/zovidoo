import { Injectable } from '@angular/core';
import { Chord, Note } from 'tonal';
import { PitchClass, PITCH_CLASSES } from './models';

const NATURAL_CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const DISPLAY: Record<string, PitchClass> = { C: 'C', 'C#': 'C#/Db', Db: 'C#/Db', D: 'D', 'D#': 'D#/Eb', Eb: 'D#/Eb', E: 'E', F: 'F', 'F#': 'F#/Gb', Gb: 'F#/Gb', G: 'G', 'G#': 'G#/Ab', Ab: 'G#/Ab', A: 'A', 'A#': 'A#/Bb', Bb: 'A#/Bb', B: 'B' };

@Injectable({ providedIn: 'root' })
export class MusicTheoryService {
  normalizePitchClass(note: string): PitchClass {
    const pc = Note.pitchClass(note.replace('/', '')) || note;
    return DISPLAY[pc] ?? PITCH_CLASSES[0];
  }
  equivalent(a: string, b: string): boolean { return this.semitone(a) === this.semitone(b); }
  semitone(value: string): number { const normalized = this.normalizePitchClass(value); return PITCH_CLASSES.indexOf(normalized); }
  noteAt(semitone: number, octave: number): string { return `${NATURAL_CHROMATIC[(semitone + 120) % 12]}${octave}`; }
  chordNotes(root: PitchClass, quality: 'Major' | 'Minor' | 'Diminished' | 'Augmented', octave = 4): string[] {
    const suffix: Record<typeof quality, string> = { Major: 'M', Minor: 'm', Diminished: 'dim', Augmented: 'aug' };
    const tonic = root.split('/')[0];
    const notes = Chord.get(`${tonic}${suffix[quality]}`).notes;
    return notes.map((note, index) => `${note}${octave + (index && this.semitone(note) < this.semitone(tonic) ? 1 : 0)}`);
  }
  progression(key: string, degrees: string[]): string[][] {
    const roots: Record<string, number> = { I: 0, ii: 2, iii: 4, IV: 5, V: 7, vi: 9 };
    const minor = new Set(['ii', 'iii', 'vi']);
    const base = this.semitone(key);
    return degrees.map(degree => this.chordNotes(PITCH_CLASSES[(base + (roots[degree] ?? 0)) % 12], minor.has(degree) ? 'Minor' : 'Major', 4));
  }
  chordSymbolNotes(symbol: string, octave = 4): string[] {
    const notes = Chord.get(symbol).notes;
    const root = Note.pitchClass(symbol) || notes[0] || 'C';
    return notes.map((note, index) => `${note}${octave + (index && this.semitone(note) < this.semitone(root) ? 1 : 0)}`);
  }
  progressionSymbols(key: string, degrees: string[]): string[] {
    const intervals: Record<string, string> = { I: '1P', ii: '2M', iii: '3M', IV: '4P', V: '5P', vi: '6M', V7: '5P' };
    return degrees.map(degree => {
      const root = Note.transpose(key, intervals[degree] ?? '1P');
      const suffix = degree === 'ii' || degree === 'iii' || degree === 'vi' ? 'm' : degree === 'V7' ? '7' : '';
      return `${root}${suffix}`;
    });
  }
}
