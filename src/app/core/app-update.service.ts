import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  readonly available = signal(false);

  constructor() { if (this.updates.isEnabled) this.updates.versionUpdates.pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')).subscribe(() => this.available.set(true)); }
  async apply(): Promise<void> { await this.updates.activateUpdate(); location.reload(); }
}
