import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Kanban } from '../models/kanban.model';
import { WorkspaceService } from './workspace.service';

@Injectable({
    providedIn: 'root'
})
export class KanbanService {
    private apiUrl = `${environment.apiUrl}`;

    constructor(
        private http: HttpClient,
        private workspaceService: WorkspaceService
    ) { }

    private getWorkspaceParams(): { params: HttpParams } {
        const workspaceId = this.workspaceService.getActiveWorkspaceId();
        let params = new HttpParams();
        if (workspaceId) {
            params = params.set('workspaceId', workspaceId);
        }
        return { params };
    }

    getCards(listId: string): Observable<Kanban[]> {
        return this.http.get<Kanban[]>(`${this.apiUrl}/lists/${listId}/cards`, this.getWorkspaceParams());
    }

    createCard(card: Partial<Kanban>): Observable<Kanban> {
        const workspaceId = this.workspaceService.getActiveWorkspaceId();
        return this.http.post<Kanban>(`${this.apiUrl}/cards`, { ...card, workspaceId });
    }

    updateCard(id: string, card: Partial<Kanban>): Observable<Kanban> {
        const workspaceId = this.workspaceService.getActiveWorkspaceId();
        return this.http.put<Kanban>(`${this.apiUrl}/cards/${id}`, { ...card, workspaceId });
    }

    deleteCard(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/cards/${id}`, this.getWorkspaceParams());
    }

    moveCard(cardId: string, listId: string, prevOrder?: string, nextOrder?: string): Observable<{ ok: boolean, order: string }> {
        const workspaceId = this.workspaceService.getActiveWorkspaceId();
        return this.http.put<{ ok: boolean, order: string }>(`${this.apiUrl}/cards/move`, {
            cardId, listId, prevOrder, nextOrder, workspaceId
        });
    }
}
