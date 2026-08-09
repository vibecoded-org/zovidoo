import { Routes } from '@angular/router';
import { exerciseEnabledGuard, profileGuard } from './core/profile.guard';

export const routes: Routes = [
  { path: 'startup', loadComponent: () => import('./features/startup.page').then(m => m.StartupPage) },
  { path: 'onboarding', loadComponent: () => import('./features/onboarding.page').then(m => m.OnboardingPage) },
  { path: 'practice/:type', canActivate: [profileGuard, exerciseEnabledGuard], loadComponent: () => import('./features/exercise.page').then(m => m.ExercisePage) },
  { path: 'tabs', canActivate: [profileGuard], loadComponent: () => import('./features/tabs.page').then(m => m.TabsPage), children: [
    { path: 'home', loadComponent: () => import('./home/home.page').then(m => m.HomePage) },
    { path: 'practice', loadComponent: () => import('./features/practice.page').then(m => m.PracticePage) },
    { path: 'history', loadComponent: () => import('./features/history.page').then(m => m.HistoryPage) },
    { path: 'settings', loadComponent: () => import('./features/settings.page').then(m => m.SettingsPage) },
    { path: '', pathMatch: 'full', redirectTo: 'home' },
  ] },
  { path: 'home', pathMatch: 'full', redirectTo: 'tabs/home' },
  { path: 'practice', pathMatch: 'full', redirectTo: 'tabs/practice' },
  { path: 'history', pathMatch: 'full', redirectTo: 'tabs/history' },
  { path: 'settings', pathMatch: 'full', redirectTo: 'tabs/settings' },
  { path: '', pathMatch: 'full', redirectTo: 'startup' },
];
