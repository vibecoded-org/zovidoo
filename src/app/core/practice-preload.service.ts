import { Injectable } from '@angular/core';

/** Warms the practice route only after the dashboard has had a chance to paint. */
@Injectable({ providedIn: 'root' })
export class PracticePreloadService {
  private scheduled = false;

  schedule(): void {
    if (this.scheduled || typeof window === 'undefined') return;
    this.scheduled = true;
    const preload = (): void => { void import('../features/exercise.page'); };
    const idleWindow = window as Window & { requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number };
    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(preload, { timeout: 3_000 });
      return;
    }
    window.setTimeout(preload, 1_500);
  }
}
