import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KanbanBoardComponent } from './kanban-board.component';
import { KanbanFacadeService } from '../../services/kanban-facade.service';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('KanbanBoardComponent', () => {
  let component: KanbanBoardComponent;
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let kanbanFacadeSpy: any;
  let messageServiceSpy: any;

  beforeEach(async () => {
    kanbanFacadeSpy = {
      getCards: vi.fn(),
      getAuditLogs: vi.fn(),
      createCard: vi.fn(),
      updateCard: vi.fn(),
      deleteCard: vi.fn(),
      moveCard: vi.fn()
    } as any;

    messageServiceSpy = {
      add: vi.fn()
    } as any;

    // Setup default returns
    (kanbanFacadeSpy.getCards as any).mockReturnValue(of([]));
    (kanbanFacadeSpy.getAuditLogs as any).mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent],
      providers: [
        { provide: KanbanFacadeService, useValue: kanbanFacadeSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
