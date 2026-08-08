import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { StorageService } from '../core/storage.service';

@Component({ selector: 'app-startup', templateUrl: './startup.page.html', styleUrls: ['./startup.page.scss'], standalone: true, imports: [IonContent] })
export class StartupPage implements OnInit, OnDestroy {
  private redirectTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly storage: StorageService, private readonly router: Router) {}

  ngOnInit(): void {
    const destination = this.storage.profile() ? '/tabs/home' : '/onboarding';
    this.redirectTimer = setTimeout(() => void this.router.navigateByUrl(destination, { replaceUrl: true }), 550);
  }

  ngOnDestroy(): void { if (this.redirectTimer) clearTimeout(this.redirectTimer); }
}
