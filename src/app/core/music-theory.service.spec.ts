import { MusicTheoryService } from './music-theory.service';
describe('MusicTheoryService', () => {
  const service = new MusicTheoryService();
  it('normalizes enharmonic spellings', () => { expect(service.normalizePitchClass('Db4')).toBe('C#/Db'); expect(service.equivalent('C#', 'Db')).toBeTrue(); });
  it('builds a triad from a tonic and quality', () => { expect(service.chordNotes('C', 'Major')).toEqual(['C4', 'E4', 'G4']); });
});
