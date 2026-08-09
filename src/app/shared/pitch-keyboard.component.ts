import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren, inject } from '@angular/core';
import { PITCH_CLASSES, PitchClass } from '../core/models';
import { TranslationService } from '../core/translation.service';
const whites: PitchClass[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const blacks: { key: PitchClass; left: number }[] = [{ key: 'C#/Db', left: 14.3 }, { key: 'D#/Eb', left: 28.6 }, { key: 'F#/Gb', left: 57.1 }, { key: 'G#/Ab', left: 71.4 }, { key: 'A#/Bb', left: 85.7 }];
@Component({ selector: 'app-pitch-keyboard', template: `<div class="piano" role="group" [attr.aria-label]="i18n.t('pianoAnswers')">@for (key of whiteKeys; track key) { <button #pianoKey class="white-key" [class.selected]="selected === key" [class.reference]="references.includes(key)" [class.correct]="revealAnswer && answer === key" [disabled]="disabled || !options.includes(key)" [attr.aria-pressed]="selected === key" (click)="select(key)" [attr.aria-label]="key">{{ key }}</button> } @for (key of blackKeys; track key.key) { <button #pianoKey class="black-key" [style.left.%]="key.left" [class.selected]="selected === key.key" [class.reference]="references.includes(key.key)" [class.correct]="revealAnswer && answer === key.key" [disabled]="disabled || !options.includes(key.key)" [attr.aria-pressed]="selected === key.key" (click)="select(key.key)" [attr.aria-label]="key.key.replace('/', ' / ')">{{ key.key.split('/')[0] }}</button> }</div>`, styleUrls: ['./answer-components.scss'], changeDetection: ChangeDetectionStrategy.OnPush, standalone: true })
export class PitchKeyboardComponent implements AfterViewChecked {
 readonly i18n = inject(TranslationService);
 @Input() disabled = false; @Input() selected = ''; @Input() answer = ''; @Input() revealAnswer = false; @Input() options: PitchClass[] = [...PITCH_CLASSES]; @Input() references: PitchClass[] = []; @Output() answered = new EventEmitter<PitchClass>(); whiteKeys = whites; blackKeys = blacks; select(key: PitchClass): void { this.answered.emit(key); }
 @ViewChildren('pianoKey') private readonly keys!: QueryList<ElementRef<HTMLButtonElement>>;
 private restoreFocus = false;
 ngAfterViewChecked(): void { if (!this.disabled && this.restoreFocus) { this.restoreFocus = false; queueMicrotask(() => this.keys.first?.nativeElement.focus()); } else if (this.disabled) this.restoreFocus = true; }
}
