import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
    private http = inject(HttpClient);
    private messageService = inject(MessageService);

    profile: UserProfile | null = null;
    loading = false;
    saving = false;

    editName = '';
    editPicture = '';
    picturePreview = '';

    ngOnInit(): void {
        this.loadProfile();
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

    onPictureChange() {
        // Simple debounce-free preview on blur
        this.picturePreview = this.editPicture;
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
            next: (updated) => {
                this.profile = updated;
                this.picturePreview = updated.picture;
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
