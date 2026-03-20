import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../../../core/services/firebase-auth.service';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { SidebarModule } from 'primeng/sidebar';
import { DividerModule } from 'primeng/divider';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, filter, take, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

let _isAdminCache: boolean | null = null;

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, DropdownModule, FormsModule, DialogModule, InputTextModule, TooltipModule, SidebarModule, DividerModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
    public auth = inject(FirebaseAuthService);
    public workspaceService = inject(WorkspaceService);
    public messageService = inject(MessageService);
    private http = inject(HttpClient);
    private router = inject(Router);

    mobileMenuVisible: boolean = false;
    displayInviteDialog: boolean = false;
    inviteEmail: string = '';
    generatedInviteLink: string = '';
    isInviting: boolean = false;
    myUserId: string = '';
    isAdmin: boolean = false;

    /** Equivalente a isAuthenticated$ de Auth0 */
    isAuthenticated$: Observable<boolean> = this.auth.currentUser$.pipe(
        map(user => !!user)
    );

    ngOnInit(): void {
        // Return cached result immediately if already fetched
        if (_isAdminCache !== null) {
            this.isAdmin = _isAdminCache;
            return;
        }
        // Only call /api/users/me once — after auth is confirmed
        this.isAuthenticated$.pipe(
            filter((a: boolean): a is true => a === true),
            take(1),
            switchMap(() => this.http.get<any>(`${environment.apiUrl}/users/me`).pipe(take(1)))
        ).subscribe({
            next: (user: { role: string }) => {
                _isAdminCache = user.role === 'admin';
                this.isAdmin = _isAdminCache;
                localStorage.setItem('userRole', user.role);  // persisted for adminRoleGuard
            },
            error: (_err: unknown) => {
                _isAdminCache = false;
                this.isAdmin = false;
            }
        });
    }

    constructor() {
        this.auth.currentUser$.subscribe(user => {
            if (user?.uid) {
                this.myUserId = user.uid;
            }
        });
    }

    get workspaces$() {
        return this.workspaceService.workspaces$;
    }

    get activeWorkspaceId() {
        return this.workspaceService.getActiveWorkspaceId();
    }

    get isAdminRoute(): boolean {
        return this.router.url.startsWith('/admin');
    }

    get activeWorkspace() {
        const workspaces = this.workspaceService['workspacesSubject'].value;
        const activeId = this.activeWorkspaceId;
        return workspaces.find((w: { _id: string }) => w._id === activeId);
    }

    get isOwner(): boolean {
        const workspace = this.activeWorkspace;
        return workspace?.isOwner === true;
    }

    get hasInviteRights(): boolean {
        const workspace = this.activeWorkspace;
        return workspace?.isOwner === true || workspace?.myRole === 'admin';
    }

    onWorkspaceChange(event: any) {
        this.workspaceService.setActiveWorkspace(event.value);
    }

    closeSidebarAfterDelay() {
        setTimeout(() => {
            this.mobileMenuVisible = false;
        }, 50);
    }

    login() {
        this.router.navigate(['/login']);
    }

    logout() {
        localStorage.removeItem('userRole');
        _isAdminCache = null;
        this.auth.logout().subscribe(() => {
            this.router.navigate(['/login']);
        });
    }

    openInviteDialog() {
        if (this.activeWorkspaceId) {
            this.inviteEmail = '';
            this.generatedInviteLink = '';
            this.displayInviteDialog = true;
        } else {
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Selecciona un proyecto primero' });
        }
    }

    inviteUser() {
        if (this.inviteEmail && !this.inviteEmail.includes('@')) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ingresa un email válido o déjalo en blanco para generar un enlace' });
            return;
        }

        const workspaceId = this.activeWorkspaceId;
        if (!workspaceId) return;

        this.isInviting = true;
        this.workspaceService.inviteMember(workspaceId, this.inviteEmail).subscribe({
            next: (res: any) => {
                if (this.inviteEmail) {
                    this.messageService.add({ severity: 'success', summary: 'Correcto', detail: `Usuario ${this.inviteEmail} invitado por correo` });
                    this.displayInviteDialog = false;
                    this.inviteEmail = '';
                } else {
                    this.generatedInviteLink = res.inviteUrl;
                    this.messageService.add({ severity: 'success', summary: 'Enlace generado', detail: 'Copia el enlace para compartirlo' });
                }
                this.isInviting = false;
            },
            error: (err: { error?: { message?: string } }) => {
                const msg = err.error?.message || 'Error al invitar al usuario';
                this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
                this.isInviting = false;
            }
        });
    }

    copyInviteLink() {
        if (this.generatedInviteLink) {
            navigator.clipboard.writeText(this.generatedInviteLink).then(() => {
                this.messageService.add({ severity: 'info', summary: 'Copiado', detail: 'Enlace copiado al portapapeles' });
                this.displayInviteDialog = false;
                this.generatedInviteLink = '';
            });
        }
    }
}
