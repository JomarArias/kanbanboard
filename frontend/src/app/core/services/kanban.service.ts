import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Kanban } from '../models/kanban.model';

@Injectable({
    providedIn: 'root'
})
export class KanbanService {
    private apiUrl = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    getCards(listId: string): Observable<Kanban[]> {
        return this.http.get<Kanban[]>(`${this.apiUrl}/lists/${listId}/cards`);
    }

    createCard(card: Partial<Kanban>): Observable<Kanban> {
        return this.http.post<Kanban>(`${this.apiUrl}/cards`, card);
    }

    updateCard(id: string, card: Partial<Kanban>): Observable<Kanban> {
        return this.http.put<Kanban>(`${this.apiUrl}/cards/${id}`, card);
    }

    deleteCard(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/cards/${id}`);
    }

    moveCard(cardId: string, listId: string, prevOrder?: string, nextOrder?: string): Observable<{ ok: boolean, order: string }> {
        return this.http.put<{ ok: boolean, order: string }>(`${this.apiUrl}/cards/move`, { cardId, listId, prevOrder, nextOrder });
    }
}
