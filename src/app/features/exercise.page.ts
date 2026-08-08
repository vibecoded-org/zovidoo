import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AudioEngineService } from '../core/audio-engine.service';
import { ExerciseQuestion, ExerciseType, PitchClass } from '../core/models';
import { SessionService } from '../core/session.service';
import { IonContent } from '@ionic/angular/standalone';
import { FourChoiceComponent } from '../shared/four-choice.component';
import { PitchKeyboardComponent } from '../shared/pitch-keyboard.component';
import { TranslationService } from '../core/translation.service';
@Component({ selector: 'app-exercise', templateUrl: './exercise.page.html', styleUrls: ['./features.scss'], standalone: true, imports: [IonContent, FourChoiceComponent, PitchKeyboardComponent] })
export class ExercisePage implements OnInit, OnDestroy {
  type: ExerciseType = 'interval'; feedback: 'correct' | 'incorrect' | '' = ''; selected = ''; elapsed = 0; private timer?: number; private questionStartedAt = 0;
  constructor(readonly session: SessionService, private readonly route: ActivatedRoute, readonly router: Router, private readonly audio: AudioEngineService, readonly i18n: TranslationService) {}
  get active() { return this.session.active(); } get question(): ExerciseQuestion | undefined { return this.active?.questions[this.active.index]; } get title(): string { return this.i18n.t(`exercise${({ note: 'Note', interval: 'Interval', chord: 'Chord', 'chord-symbol': 'ChordSymbol', progression: 'Progression', 'progression-chords': 'ProgressionChords' })[this.type]}`); }
  ngOnInit(): void { const value = this.route.snapshot.paramMap.get('type'); if (value && ['note','interval','chord','chord-symbol','progression','progression-chords'].includes(value)) this.type = value as ExerciseType; this.timer = window.setInterval(() => this.tickQuestionTimer(), 250); }
  ionViewWillEnter(): void { this.session.start(this.type); this.startQuestionTimer(); setTimeout(() => void this.replay(), 120); }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); this.audio.stop(); this.session.cancel(); }
  ionViewWillLeave(): void { this.audio.stop(); this.session.cancel(); }
  async replay(): Promise<void> { if (this.question) { this.session.replay(); await this.audio.play(this.question.audio); } }
  async answer(value: string): Promise<void> {
    if (!this.question || this.active?.state === 'completed' || this.feedback) return;
    const answeredIndex = this.active?.index;
    this.audio.stop(); this.selected = value;
    const result = this.session.answer(value);
    this.feedback = result.correct ? 'correct' : 'incorrect';
    setTimeout(() => {
      const replay = result.correct ? this.session.advance() : false;
      if (!result.correct) { this.session.resumeAnswering(); this.resumeQuestionTimer(); }
      if (replay) {
        if (this.active?.index !== answeredIndex) this.startQuestionTimer();
        else this.resumeQuestionTimer();
        void this.replay();
      }
      this.feedback = ''; this.selected = '';
    }, result.correct ? 650 : 900);
  }
  progressAnswer(value: string): void { void this.answer(value); }
  format(seconds: number): string { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  chordRootMode(): boolean { return this.type === 'chord' && this.active?.chordStage === 'root'; }
  chordIndex(): number { return (this.active?.progressionChordIndex ?? 0) + 1; }
  isProgressionChord(): boolean { return this.type === 'progression-chords'; }
  displayedAnswer(): string { return this.session.currentExpectedAnswer(); }
  displayedOptions(): string[] { return this.session.currentAnswerOptions(); }
  asPitch(value: PitchClass): void { void this.answer(value); }
  exit(): void { this.audio.stop(); this.session.cancel(); void this.router.navigateByUrl('/tabs/practice'); }
  private startQuestionTimer(): void { this.elapsed = 0; this.questionStartedAt = Date.now(); }
  private resumeQuestionTimer(): void { this.questionStartedAt = Date.now() - this.elapsed * 1000; }
  private tickQuestionTimer(): void { if (this.active?.state === 'waitingForAnswer') this.elapsed = Math.floor((Date.now() - this.questionStartedAt) / 1000); }
}
