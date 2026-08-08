import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { StorageService } from '../core/storage.service';

@Component({ selector: 'app-startup', templateUrl: './startup.page.html', styleUrls: ['./startup.page.scss'], standalone: true, imports: [IonContent] })
export class StartupPage implements OnInit, OnDestroy {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  private redirectTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const destination = this.storage.profile() ? '/tabs/home' : '/onboarding';
    this.redirectTimer = setTimeout(() => void this.router.navigateByUrl(destination, { replaceUrl: true }), 550);
  }

  ngOnDestroy(): void { if (this.redirectTimer) clearTimeout(this.redirectTimer); }
}
