import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AppUpdateService } from './core/app-update.service';
import { TranslationService } from './core/translation.service';
import { NotificationService } from './core/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent { readonly updates = inject(AppUpdateService); readonly i18n = inject(TranslationService); private readonly notifications = inject(NotificationService); }
