import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AudioEngineService } from '../core/audio-engine.service';
import { EXERCISE_TYPES, ExerciseQuestion, ExerciseType, PitchClass, SessionKind } from '../core/models';
import { SessionService } from '../core/session.service';
import { IonContent } from '@ionic/angular/standalone';
import { FourChoiceComponent } from '../shared/four-choice.component';
import { PitchKeyboardComponent } from '../shared/pitch-keyboard.component';
import { TranslationService } from '../core/translation.service';
import { exerciseTranslationKey } from '../core/exercise-catalog.config';
@Component({ selector: 'app-exercise', templateUrl: './exercise.page.html', styleUrls: ['./features.scss'], standalone: true, imports: [IonContent, FourChoiceComponent, PitchKeyboardComponent] })
export class ExercisePage implements OnInit, OnDestroy {
  readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly audio = inject(AudioEngineService);
  readonly i18n = inject(TranslationService);

  type: SessionKind = 'interval'; feedback: 'correct' | 'incorrect' | '' = ''; selected = ''; elapsed = 0; private timer?: number; private feedbackTimer?: number; private playbackTimer?: number; private questionStartedAt = 0;
  get active() { return this.session.active(); } get question(): ExerciseQuestion | undefined { return this.active?.questions[this.active.index]; } get questionType(): ExerciseType { return this.question?.type ?? 'interval'; } get sessionElapsed(): number { return this.active ? Math.floor((Date.now() - this.active.startedAt) / 1000) : 0; } get title(): string { return this.i18n.t(`exercise${exerciseTranslationKey(this.questionType)}`); }
  ngOnInit(): void { this.route.paramMap.subscribe(params => this.setType(params.get('type'))); this.timer = window.setInterval(() => this.tickQuestionTimer(), 1_000); }
  ionViewWillEnter(): void { this.session.start(this.type); this.startQuestionTimer(); this.playbackTimer = window.setTimeout(() => void this.replay(), 120); }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); this.clearDeferred(); this.audio.stop(); this.session.cancel(); }
  ionViewWillLeave(): void { this.clearDeferred(); this.audio.stop(); this.session.cancel(); }
  async replay(): Promise<void> { if (this.question) { this.session.replay(); await this.audio.play(this.question.audio, this.question.id); } }
  async answer(value: string): Promise<void> {
    if (!this.question || this.active?.state === 'completed' || this.feedback) return;
    const answeredIndex = this.active?.index;
    this.audio.stop(); this.selected = value;
    const result = this.session.answer(value);
    this.feedback = result.correct ? 'correct' : 'incorrect';
    this.feedbackTimer = window.setTimeout(() => {
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
  chordRootMode(): boolean { return this.questionType === 'chord' && this.active?.chordStage === 'root'; }
  chordIndex(): number { return (this.active?.progressionChordIndex ?? 0) + 1; }
  isProgressionChord(): boolean { return this.questionType === 'progression-chords'; }
  feedbackDetail(): string { if (this.feedback === 'correct') return this.active?.pendingTransition === 'next-question' || this.active?.pendingTransition === 'complete' ? this.question?.explanation ?? '' : this.i18n.t('continueListening'); return this.i18n.t('incorrectHint'); }
  displayedAnswer(): string { return this.session.currentExpectedAnswer(); }
  displayedOptions(): string[] { return this.session.currentAnswerOptions(); }
  asPitch(value: PitchClass): void { void this.answer(value); }
  exit(): void { this.audio.stop(); this.session.cancel(); void this.router.navigateByUrl('/tabs/practice'); }
  private startQuestionTimer(): void { this.elapsed = 0; this.questionStartedAt = Date.now(); }
  private resumeQuestionTimer(): void { this.questionStartedAt = Date.now() - this.elapsed * 1000; }
  private tickQuestionTimer(): void { if (this.active?.state === 'waitingForAnswer') this.elapsed = Math.floor((Date.now() - this.questionStartedAt) / 1000); }
  private clearDeferred(): void { if (this.feedbackTimer) clearTimeout(this.feedbackTimer); if (this.playbackTimer) clearTimeout(this.playbackTimer); this.feedbackTimer = undefined; this.playbackTimer = undefined; this.feedback = ''; }
  private setType(value: string | null): void { if (value === 'quick' || (value !== null && EXERCISE_TYPES.includes(value as ExerciseType))) this.type = value as SessionKind; }
}
