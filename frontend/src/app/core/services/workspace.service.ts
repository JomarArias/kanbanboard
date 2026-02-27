import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Workspace } from '../models/workspace.model';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceService {
    private apiUrl = `${environment.apiUrl}/workspaces`;

    private workspacesSubject = new BehaviorSubject<Workspace[]>([]);
    workspaces$ = this.workspacesSubject.asObservable();

    private activeWorkspaceIdSubject = new BehaviorSubject<string | null>(null);
    activeWorkspaceId$ = this.activeWorkspaceIdSubject.asObservable();

    constructor(private http: HttpClient) { }

    fetchMyWorkspaces(): Observable<Workspace[]> {
        return this.http.get<Workspace[]>(this.apiUrl).pipe(
            tap(workspaces => {
                this.workspacesSubject.next(workspaces);
                // If no active workspace is set, select the first one by default
                if (workspaces.length > 0 && !this.activeWorkspaceIdSubject.value) {
                    this.setActiveWorkspace(workspaces[0]._id);
                }
            })
        );
    }

    createWorkspace(name: string): Observable<Workspace> {
        return this.http.post<Workspace>(this.apiUrl, { name }).pipe(
            tap(newWorkspace => {
                const current = this.workspacesSubject.value;
                this.workspacesSubject.next([...current, newWorkspace]);
                this.setActiveWorkspace(newWorkspace._id);
            })
        );
    }

    setActiveWorkspace(id: string) {
        this.activeWorkspaceIdSubject.next(id);
    }

    getActiveWorkspaceId(): string | null {
        return this.activeWorkspaceIdSubject.value;
    }

    getWorkspaceById(id: string) {
        return this.workspacesSubject.value.find(w => w._id === id) || null;
    }

    getWorkspaceMembers(workspaceId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/members`, {
            params: { workspaceId }
        });
    }

    inviteMember(workspaceId: string, email: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/invite`, { workspaceId, email });
    }
}
