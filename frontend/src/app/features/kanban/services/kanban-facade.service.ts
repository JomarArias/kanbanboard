import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { KanbanService } from '../../../core/services/kanban.service';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { Kanban } from '../../../core/models/kanban.model';
import { AuditLog } from '../../../core/models/audit-log.model';

@Injectable({
  providedIn: 'root'
})
export class KanbanFacadeService {

  constructor(
    private kanbanService: KanbanService,
    private auditLogService: AuditLogService
  ) { }

  getCards(listId: string): Observable<Kanban[]> {
    return this.kanbanService.getCards(listId);
  }

  createCard(card: Partial<Kanban>): Observable<Kanban> {
    return this.kanbanService.createCard(card);
  }

  updateCard(id: string, card: Partial<Kanban>): Observable<Kanban> {
    return this.kanbanService.updateCard(id, card);
  }

  deleteCard(id: string): Observable<void> {
    return this.kanbanService.deleteCard(id);
  }

  moveCard(cardId: string, listId: string, prevOrder?: string, nextOrder?: string): Observable<{ ok: boolean, order: string }> {
    return this.kanbanService.moveCard(cardId, listId, prevOrder, nextOrder);
  }

  getAuditLogs(limit: number = 100, offset: number = 0): Observable<AuditLog[]> {
    return this.auditLogService.getAuditLogs(limit, offset);
  }
}
