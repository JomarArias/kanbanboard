import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthSyncService } from './core/services/auth-sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ConfirmPopupModule, ToastModule, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private authSync = inject(AuthSyncService);
  protected router = inject(Router);

  get isLoginPage(): boolean {
    return this.router.url.startsWith('/login');
  }

  ngOnInit() {
    this.authSync.initSyncListener();
  }
};
