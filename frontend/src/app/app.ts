import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthSyncService } from './core/services/auth-sync.service';
import { FirebaseAuthService } from './core/services/firebase-auth.service';
import { InactivityService } from './core/services/inactivity.service';
import { WorkspaceService } from './core/services/workspace.service';
import { ChatPanelComponent } from './features/kanban/components/chat-panel/chat-panel.component';
import { MessageService } from 'primeng/api';

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
  private workspaceService = inject(WorkspaceService);
  private messageService = inject(MessageService);

  get isMinimalLayoutPage(): boolean {
    return this.router.url.startsWith('/login') || this.router.url.startsWith('/404');
  }

  ngOnInit() {
    this.authSync.initSyncListener();
    // The InactivityService starts tracking automatically upon injection because tracking is initialized in its constructor.
    
    // Capture invite token from URL if present
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('inviteToken');
    if (inviteToken) {
      localStorage.setItem('pending_invite_token', inviteToken);
      // Clean up URL without reloading
      this.router.navigate([], { queryParams: { inviteToken: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }

    // Process pending invite on login
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        const pendingToken = localStorage.getItem('pending_invite_token');
        if (pendingToken) {
          this.workspaceService.acceptInvitation(pendingToken).subscribe({
            next: (res: any) => {
              localStorage.removeItem('pending_invite_token');
              this.messageService.add({ severity: 'success', summary: 'Bienvenido', detail: 'Te has unido al proyecto exitosamente.' });
              if (res.workspaceId) {
                // Ensure we fetch workspaces and set active
                this.workspaceService.fetchMyWorkspaces().subscribe(() => {
                  this.workspaceService.setActiveWorkspace(res.workspaceId);
                  this.router.navigate(['/']);
                });
              }
            },
            error: (err: any) => {
              localStorage.removeItem('pending_invite_token');
              const msg = err.error?.message || 'No se pudo aceptar la invitación';
              this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
            }
          });
        }
      }
    });

  }
};
