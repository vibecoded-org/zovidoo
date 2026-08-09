import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, musicalNotesOutline, settingsOutline, timeOutline } from 'ionicons/icons';
import { TranslationService } from '../core/translation.service';
import { RouterLink } from '@angular/router';

addIcons({ homeOutline, musicalNotesOutline, timeOutline, settingsOutline });

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, RouterLink],
  styleUrls: ['./tabs.page.scss'],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" [attr.aria-label]="i18n.t('navigation')">
        <ion-tab-button tab="home" [routerLink]="['/tabs/home']"><ion-icon name="home-outline" aria-hidden="true"></ion-icon><ion-label>{{ i18n.t('home') }}</ion-label></ion-tab-button>
        <ion-tab-button tab="practice" [routerLink]="['/tabs/practice']"><ion-icon name="musical-notes-outline" aria-hidden="true"></ion-icon><ion-label>{{ i18n.t('practice') }}</ion-label></ion-tab-button>
        <ion-tab-button tab="history" [routerLink]="['/tabs/history']"><ion-icon name="time-outline" aria-hidden="true"></ion-icon><ion-label>{{ i18n.t('history') }}</ion-label></ion-tab-button>
        <ion-tab-button tab="settings" [routerLink]="['/tabs/settings']"><ion-icon name="settings-outline" aria-hidden="true"></ion-icon><ion-label>{{ i18n.t('settings') }}</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPage {
  readonly i18n = inject(TranslationService);
}
