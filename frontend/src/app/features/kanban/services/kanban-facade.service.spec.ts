import { TestBed } from '@angular/core/testing';
import { KanbanFacadeService } from './kanban-facade.service';
import { KanbanService } from '../../../core/services/kanban.service';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('KanbanFacadeService', () => {
  let service: KanbanFacadeService;
  let kanbanServiceSpy: any;
  let auditLogServiceSpy: any;

  beforeEach(() => {
    kanbanServiceSpy = {
      getCards: vi.fn(),
      createCard: vi.fn(),
      updateCard: vi.fn(),
      deleteCard: vi.fn(),
      moveCard: vi.fn()
    } as any;

    auditLogServiceSpy = {
      getAuditLogs: vi.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: KanbanService, useValue: kanbanServiceSpy },
        { provide: AuditLogService, useValue: auditLogServiceSpy }
      ]
    });
    service = TestBed.inject(KanbanFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
