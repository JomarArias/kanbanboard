import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

import { environment } from '../../../../../environments/environment';
import { FirebaseAuthService } from '../../../../core/services/firebase-auth.service';
import { KanbanService } from '../../../../core/services/kanban.service';
import { GoogleCalendarConnectionStatus, GoogleCalendarService } from '../../../../core/services/google-calendar.service';

interface UserProfile {
    _id: string;
    name: string;
    email: string;
    picture: string;
    role: string;
    isDeleted: boolean;
    createdAt: string;
}

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterModule,
        ButtonModule, InputTextModule, AvatarModule, ToastModule, TagModule, CardModule, DividerModule
    ],
    providers: [MessageService],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
    private readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    private http = inject(HttpClient);
    private messageService = inject(MessageService);
    private auth = inject(FirebaseAuthService);
    private kanbanService = inject(KanbanService);
    private googleCalendarService = inject(GoogleCalendarService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    profile: UserProfile | null = null;
    loading = false;
    saving = false;
    isUploadingAvatar = false;
    googleLoading = false;
    googleConnecting = false;
    googleDisconnecting = false;
    googleStatusError = '';
    googleStatus: GoogleCalendarConnectionStatus = { connected: false };

    editName = '';
    editPicture = '';
    picturePreview = '';

    ngOnInit(): void {
        this.loadProfile();
        this.loadGoogleCalendarStatus();
        this.handleGoogleCalendarCallbackFeedback();
    }

    private handleGoogleCalendarCallbackFeedback() {
        const state = this.route.snapshot.queryParamMap.get('googleCalendar');
        if (!state) return;

        if (state === 'connected') {
            this.messageService.add({
                severity: 'success',
                summary: 'Correcto',
                detail: 'Google Calendar vinculado correctamente'
            });
            this.loadGoogleCalendarStatus();
        } else if (state === 'error') {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo completar la vinculación con Google Calendar'
            });
        }

        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { googleCalendar: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    loadProfile() {
        this.loading = true;
        this.http.get<UserProfile>(`${environment.apiUrl}/users/me`).subscribe({
            next: (p) => {
                this.profile = p;
                this.editName = p.name;
                this.editPicture = p.picture;
                this.picturePreview = p.picture;
                this.loading = false;
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el perfil' });
                this.loading = false;
            }
        });
    }

    loadGoogleCalendarStatus() {
        this.googleLoading = true;
        this.googleStatusError = '';

        this.googleCalendarService.getStatus().subscribe({
            next: (status) => {
                this.googleStatus = status;
                this.googleLoading = false;
            },
            error: (err) => {
                this.googleStatusError = err?.error?.message || 'No se pudo consultar el estado de Google Calendar';
                this.googleLoading = false;
            }
        });
    }

    connectGoogleCalendar() {
        this.googleConnecting = true;

        this.googleCalendarService.getConnectUrl().subscribe({
            next: ({ authUrl }) => {
                this.googleConnecting = false;
                if (!authUrl) {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se recibió URL de autorización' });
                    return;
                }

                window.location.href = authUrl;
            },
            error: (err) => {
                this.googleConnecting = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.message || 'No se pudo iniciar la vinculación con Google Calendar'
                });
            }
        });
    }

    disconnectGoogleCalendar() {
        this.googleDisconnecting = true;

        this.googleCalendarService.disconnect().subscribe({
            next: () => {
                this.googleDisconnecting = false;
                this.googleStatus = { connected: false };
                this.messageService.add({
                    severity: 'success',
                    summary: 'Correcto',
                    detail: 'Google Calendar desvinculado correctamente'
                });
                this.loadGoogleCalendarStatus();
            },
            error: (err) => {
                this.googleDisconnecting = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.message || 'No se pudo desvincular Google Calendar'
                });
            }
        });
    }

    onProfileImageFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Selecciona un archivo JPG, PNG o WEBP' });
            input.value = '';
            return;
        }

        if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'La imagen no debe exceder 5MB' });
            input.value = '';
            return;
        }

        this.isUploadingAvatar = true;

        this.kanbanService.uploadProfileImage(file).subscribe({
            next: ({ imageUrl }) => {
                this.editPicture = imageUrl;
                this.picturePreview = imageUrl;
                this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Imagen de perfil subida correctamente' });
            },
            error: (err) => {
                const message = err?.error?.message || 'No se pudo subir la imagen de perfil';
                this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
            },
            complete: () => {
                this.isUploadingAvatar = false;
                input.value = '';
            }
        });
    }

    saveProfile() {
        if (!this.editName.trim() || this.editName.trim().length < 2) {
            this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El nombre debe tener al menos 2 caracteres' });
            return;
        }

        this.saving = true;
        this.http.patch<UserProfile>(`${environment.apiUrl}/users/me`, {
            name: this.editName.trim(),
            picture: this.editPicture.trim()
        }).subscribe({
            next: async (updated) => {
                this.profile = updated;
                this.picturePreview = updated.picture;
                try {
                    await this.auth.updateUserProfile(updated.name, updated.picture);
                } catch (e) {
                    console.error('Failed to update Firebase Auth profile', e);
                }
                this.messageService.add({ severity: 'success', summary: '¡Guardado!', detail: 'Perfil actualizado correctamente' });
                this.saving = false;
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar el perfil' });
                this.saving = false;
            }
        });
    }

    getRoleSeverity(role: string): 'success' | 'info' | 'danger' | 'warn' | 'secondary' {
        return role === 'admin' ? 'danger' : 'info';
    }

    getRoleLabel(role: string): string {
        const labels: Record<string, string> = { admin: 'Administrador', member: 'Miembro', editor: 'Editor', viewer: 'Visitante' };
        return labels[role] || role;
    }

    initials(name: string): string {
        return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    }
}
