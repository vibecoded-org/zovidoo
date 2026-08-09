import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AudioEngineService } from '../core/audio-engine.service';
import { Difficulty, EXERCISE_TYPES, ExerciseQuestion, ExerciseType, PitchClass, SessionKind } from '../core/models';
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

  type: SessionKind = 'interval'; difficulty: Difficulty = 1; freePlay = false; feedback: 'correct' | 'incorrect' | '' = ''; selected = ''; elapsed = 0; replaying = false; private timer?: number; private feedbackTimer?: number; private playbackTimer?: number; private replayTimer?: number; private questionStartedAt = 0; private questionElapsedMs = 0;
  get active() { return this.session.active(); } get question(): ExerciseQuestion | undefined { return this.active?.questions[this.active.index]; } get questionType(): ExerciseType { return this.question?.type ?? 'interval'; } get completedDurationMs(): number { return this.active?.exerciseResults.reduce((total, result) => total + result.durationMs, 0) ?? 0; } get title(): string { return this.i18n.t(`exercise${exerciseTranslationKey(this.questionType)}`); }
  ngOnInit(): void { this.route.paramMap.subscribe(params => { this.setType(params.get('type')); this.setDifficulty(params.get('level')); this.freePlay = this.route.snapshot.data['freePlay'] === true; }); this.timer = window.setInterval(() => this.tickQuestionTimer(), 1_000); }
  ionViewWillEnter(): void { if (this.freePlay) this.session.startFreePlay(this.type as ExerciseType, this.difficulty); else this.session.start(this.type); this.startQuestionTimer(); this.playbackTimer = window.setTimeout(() => void this.replay(), 120); }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); this.clearDeferred(); this.audio.stop(); this.session.cancel(); }
  ionViewWillLeave(): void { this.clearDeferred(); this.audio.stop(); this.session.cancel(); }
  async replay(): Promise<void> {
    const question = this.question;
    if (!question || this.replaying) return;
    this.replaying = true;
    this.session.replay();
    try {
      await this.audio.play(question.audio, question.id);
      this.replayTimer = window.setTimeout(() => this.finishReplay(), this.audio.playbackDuration(question.audio) * 1_000);
    } catch {
      this.finishReplay();
    }
  }
  async answer(value: string): Promise<void> {
    if (!this.question || this.active?.state === 'completed' || this.feedback) return;
    const answeredIndex = this.active?.index;
    this.audio.stop(); this.finishReplay(); this.selected = value;
    const result = this.session.answer(value, this.pauseQuestionTimer());
    this.feedback = result.correct ? 'correct' : 'incorrect';
    this.feedbackTimer = window.setTimeout(() => {
      const replay = result.correct || result.failed ? this.session.advance() : false;
      if (!result.correct && !result.failed) { this.session.resumeAnswering(); this.resumeQuestionTimer(); }
      if (replay) {
        if (result.failed || this.active?.freePlay || this.active?.index !== answeredIndex) this.startQuestionTimer();
        else this.resumeQuestionTimer();
        void this.replay();
      }
      this.feedback = ''; this.selected = '';
    }, result.correct ? 650 : 900);
  }
  progressAnswer(value: string): void { void this.answer(value); }
  format(seconds: number): string { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  formatDuration(milliseconds: number): string { return this.format(Math.round(milliseconds / 1_000)); }
  exerciseTitle(type: ExerciseType): string { return this.i18n.t(`exercise${exerciseTranslationKey(type)}`); }
  exerciseErrors(errors: number): string { return errors === 0 ? this.i18n.t('noErrors') : this.i18n.t('errors', { count: errors }); }
  chordRootMode(): boolean { return this.questionType === 'chord' && this.active?.chordStage === 'root'; }
  chordIndex(): number { return (this.active?.progressionChordIndex ?? 0) + 1; }
  isProgressionChord(): boolean { return this.questionType === 'progression-chords'; }
  feedbackDetail(): string { if (this.feedback === 'correct') return this.active?.pendingTransition === 'next-question' || this.active?.pendingTransition === 'complete' ? this.question?.explanation ?? '' : this.i18n.t('continueListening'); return this.active?.pendingTransition ? this.question?.explanation ?? '' : this.i18n.t('incorrectHint'); }
  displayedAnswer(): string { return this.session.currentExpectedAnswer(); }
  displayedOptions(): string[] { return this.session.currentAnswerOptions(); }
  asPitch(value: PitchClass): void { void this.answer(value); }
  exit(): void { this.audio.stop(); this.finishReplay(); this.session.cancel(); void this.router.navigateByUrl(this.freePlay ? '/free-play' : '/tabs/practice'); }
  private startQuestionTimer(): void { this.elapsed = 0; this.questionElapsedMs = 0; this.questionStartedAt = Date.now(); }
  private resumeQuestionTimer(): void { this.questionStartedAt = Date.now(); }
  private pauseQuestionTimer(): number { if (this.questionStartedAt) { this.questionElapsedMs += Math.max(0, Date.now() - this.questionStartedAt); this.questionStartedAt = 0; } this.elapsed = Math.floor(this.questionElapsedMs / 1_000); return this.questionElapsedMs; }
  private tickQuestionTimer(): void { if (this.active?.state === 'waitingForAnswer' && this.questionStartedAt) this.elapsed = Math.floor((this.questionElapsedMs + Date.now() - this.questionStartedAt) / 1_000); }
  private finishReplay(): void { if (this.replayTimer) clearTimeout(this.replayTimer); this.replayTimer = undefined; this.replaying = false; }
  private clearDeferred(): void { if (this.feedbackTimer) clearTimeout(this.feedbackTimer); if (this.playbackTimer) clearTimeout(this.playbackTimer); this.finishReplay(); this.feedbackTimer = undefined; this.playbackTimer = undefined; this.feedback = ''; }
  private setType(value: string | null): void { if (value === 'quick' || (value !== null && EXERCISE_TYPES.includes(value as ExerciseType))) this.type = value as SessionKind; }
  private setDifficulty(value: string | null): void { const difficulty = Number(value); if (Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 10) this.difficulty = difficulty as Difficulty; }
}
