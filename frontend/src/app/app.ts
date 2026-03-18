import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthSyncService } from './core/services/auth-sync.service';
import { FirebaseAuthService } from './core/services/firebase-auth.service';
import { InactivityService } from './core/services/inactivity.service';
import { ChatPanelComponent } from './features/kanban/components/chat-panel/chat-panel.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ConfirmPopupModule, ToastModule, NavbarComponent, ChatPanelComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  chatOpen = false;
  private authSync = inject(AuthSyncService);
  private inactivityService = inject(InactivityService);
  protected router = inject(Router);
  public auth = inject(FirebaseAuthService);

  get isMinimalLayoutPage(): boolean {
    return this.router.url.startsWith('/login') || this.router.url.startsWith('/404');
  }

  ngOnInit() {
    this.authSync.initSyncListener();
    // The InactivityService starts tracking automatically upon injection because tracking is initialized in its constructor.
  }
};
