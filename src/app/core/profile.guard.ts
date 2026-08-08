import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from './storage.service';

export const profileGuard: CanActivateFn = () => inject(StorageService).profile() ? true : inject(Router).createUrlTree(['/onboarding']);
