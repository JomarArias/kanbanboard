import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { WorkspaceService } from './workspace.service';

/**
 * Listens to Firebase auth state and triggers workspace loading once authenticated.
 * Sync to backend is now done inside FirebaseAuthService.loginWithEmail/Google/register.
 */
@Injectable({ providedIn: 'root' })
export class AuthSyncService {
    private auth = inject(Auth);
    private workspaceService = inject(WorkspaceService);
    private sub?: Subscription;
    private synced = false;

    initSyncListener(): void {
        this.sub = authState(this.auth).pipe(
            filter(user => !!user),
            take(1)
        ).subscribe(() => {
            if (this.synced) return;
            this.synced = true;
            this.workspaceService.fetchMyWorkspaces().subscribe({
                next: () => console.log('Workspaces loaded!'),
                error: (err: unknown) => console.error('Failed to load workspaces', err)
            });
        });
    }

    reset(): void {
        this.synced = false;
        this.sub?.unsubscribe();
    }
}
