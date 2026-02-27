import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AdminUser {
    _id: string;
    name: string;
    email: string;
    picture: string;
    role: 'admin' | 'member';
    isDeleted: boolean;
    deletedAt?: string;
    createdAt: string;
}

export interface AdminAuditLog {
    _id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
    details: string;
    performedBy?: { _id: string; name: string; picture: string; email: string };
    timestamp: string;
}

export interface AdminWorkspace {
    _id: string;
    name: string;
    owners: { _id: string; name: string; email: string; picture: string }[];
    members: { _id: string; name: string; email: string; picture: string; role: string }[];
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/users`;
    private wsBase = `${environment.apiUrl}`;

    // ─── Users ──────────────────────────────────────────────────────────────
    getUsers() {
        return this.http.get<AdminUser[]>(this.base);
    }

    updateUserRole(userId: string, role: 'admin' | 'member') {
        return this.http.patch<AdminUser>(`${this.base}/${userId}/role`, { role });
    }

    deactivateUser(userId: string) {
        return this.http.delete<{ message: string; user: AdminUser }>(`${this.base}/${userId}`);
    }

    reactivateUser(userId: string) {
        return this.http.patch<{ message: string; user: AdminUser }>(`${this.base}/${userId}/reactivate`, {});
    }

    getAuditLogs(filters?: { action?: string; from?: string; to?: string; limit?: number }) {
        let params = new HttpParams();
        if (filters?.action) params = params.set('action', filters.action);
        if (filters?.from) params = params.set('from', filters.from);
        if (filters?.to) params = params.set('to', filters.to);
        if (filters?.limit) params = params.set('limit', filters.limit.toString());
        return this.http.get<AdminAuditLog[]>(`${this.base}/audit-logs`, { params });
    }

    // ─── Workspaces (Boards) ─────────────────────────────────────────────────
    getWorkspaces() {
        return this.http.get<AdminWorkspace[]>(`${this.wsBase}/admin/workspaces`);
    }

    createWorkspace(name: string, ownerUserId?: string) {
        return this.http.post<AdminWorkspace>(`${this.wsBase}/admin/workspaces`, { name, ownerUserId });
    }

    updateWorkspace(id: string, name: string) {
        return this.http.patch<AdminWorkspace>(`${this.wsBase}/admin/workspaces/${id}`, { name });
    }

    deleteWorkspace(id: string) {
        return this.http.delete<{ message: string }>(`${this.wsBase}/admin/workspaces/${id}`);
    }

    addMemberToWorkspace(workspaceId: string, userId: string, role: string) {
        return this.http.post<any>(`${this.wsBase}/admin/workspaces/${workspaceId}/members`, { userId, role });
    }

    removeMemberFromWorkspace(workspaceId: string, userId: string) {
        return this.http.delete<{ message: string }>(`${this.wsBase}/admin/workspaces/${workspaceId}/members/${userId}`);
    }
}
