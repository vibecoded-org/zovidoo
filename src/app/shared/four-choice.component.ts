import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
@Component({ selector: 'app-four-choice', template: `<div class="choices" role="group">@for (option of options; track option) { <button #choiceButton class="choice" [class.correct]="(feedback === 'correct' || revealAnswer) && option === answer" [class.incorrect]="feedback === 'incorrect' && option === selected" [disabled]="disabled" [attr.aria-pressed]="option === selected" (click)="pick(option)">{{ option }} @if ((feedback === 'correct' || revealAnswer) && option === answer) { <span aria-hidden="true">✓</span> }</button> }</div>`, styleUrls: ['./answer-components.scss'], changeDetection: ChangeDetectionStrategy.OnPush, standalone: true })
export class FourChoiceComponent implements AfterViewChecked {
  @Input() options: string[] = []; @Input() disabled = false; @Input() feedback: 'correct' | 'incorrect' | '' = ''; @Input() answer = ''; @Input() selected = ''; @Input() revealAnswer = false; @Output() answered = new EventEmitter<string>();
  @ViewChildren('choiceButton') private readonly buttons!: QueryList<ElementRef<HTMLButtonElement>>;
  private restoreFocus = false;
  pick(value: string): void { if (!this.disabled) this.answered.emit(value); }
  ngAfterViewChecked(): void { if (!this.disabled && !this.feedback && this.restoreFocus) { this.restoreFocus = false; queueMicrotask(() => this.buttons.first?.nativeElement.focus()); } else if (this.disabled) this.restoreFocus = true; }
}
