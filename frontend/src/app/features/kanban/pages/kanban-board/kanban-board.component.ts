import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { KanbanColumnComponent } from '../../components/kanban-column/kanban-column.component';
import { Kanban } from '../../../../core/models/kanban.model';
import { KanbanFacadeService } from '../../services/kanban-facade.service';
import { AuditLog } from '../../../../core/models/audit-log.model';
import { AuditLogComponent } from '../../components/audit-log/audit-log.component';
import { SpeedDialModule } from 'primeng/speeddial';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    CardModule,
    KanbanColumnComponent,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FormsModule,
    AuditLogComponent,
    SpeedDialModule
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
  host: {
    class: 'block h-full'
  }
})
export class KanbanBoardComponent implements OnInit {
  boardData: { todo: Kanban[]; inProgress: Kanban[]; done: Kanban[];[key: string]: Kanban[] } = {
    todo: [],
    inProgress: [],
    done: [],
  };

  displayEditDialog: boolean = false;
  editingCard: Kanban = { _id: '', title: '', task: '', listId: '', order: '' };

  auditLogs: AuditLog[] = [];
  displayAuditLog: boolean = false;
  items: MenuItem[] = [];

  constructor(
    private kanbanFacade: KanbanFacadeService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadCards();
    this.loadAuditLogs();

    this.items = [
      {
        icon: 'pi pi-history',
        command: () => {
          this.displayAuditLog = true;
          this.loadAuditLogs();
        },
        tooltipOptions: {
          tooltipLabel: 'Ver Historial'
        }
      }
    ];
  }

  loadCards() {
    ['todo', 'inProgress', 'done'].forEach(listId => {
      this.kanbanFacade.getCards(listId).subscribe({
        next: (cards) => {
          this.boardData[listId] = cards;
        },
        error: (err) => console.error(err)
      });
    });
  }

  loadAuditLogs() {
    this.kanbanFacade.getAuditLogs().subscribe({
      next: (logs) => {
        this.auditLogs = logs;
      },
      error: (err) => console.error(err)
    });
  }

  addCard(columnKey: string) {
    const newCard: Partial<Kanban> = {
      title: 'New Card',
      task: 'New Task',
      listId: columnKey
    };

    this.kanbanFacade.createCard(newCard).subscribe({
      next: (card) => {
        this.boardData[columnKey].push(card);
        this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta agregada' });
        this.loadAuditLogs();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la tarjeta' })
    });
  }

  onDeleteCard(cardId: string) {
    this.kanbanFacade.deleteCard(cardId).subscribe({
      next: () => {
        for (const key of Object.keys(this.boardData)) {
          const index = this.boardData[key].findIndex(c => c._id === cardId);
          if (index !== -1) {
            this.boardData[key].splice(index, 1);
            this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta eliminada' });
            this.loadAuditLogs();
            return;
          }
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la tarjeta' })
    });
  }

  onEditCard(card: Kanban) {
    this.editingCard = { ...card };
    this.displayEditDialog = true;
  }

  isValidInput(text: string): boolean {
    const pattern = /^[a-zA-Z0-9\s.,\-_ñÑáéíóúÁÉÍÓÚ?¿!¡]+$/;
    return pattern.test(text);
  }

  saveEditedCard() {
    if (!this.editingCard.title.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'El título es obligatorio' });
      return;
    }

    if (!this.isValidInput(this.editingCard.title)) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El título contiene caracteres inválidos' });
      return;
    }

    if (this.editingCard.task && !this.isValidInput(this.editingCard.task)) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La tarea contiene caracteres inválidos' });
      return;
    }

    this.kanbanFacade.updateCard(this.editingCard._id, { title: this.editingCard.title, task: this.editingCard.task }).subscribe({
      next: (updatedCard) => {
        for (const key of Object.keys(this.boardData)) {
          const index = this.boardData[key].findIndex(c => c._id === updatedCard._id);
          if (index !== -1) {
            this.boardData[key][index] = updatedCard;
            this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta actualizada' });
            this.displayEditDialog = false;
            this.loadAuditLogs();
            return;
          }
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la tarjeta' })
    });
  }

  drop(event: CdkDragDrop<Kanban[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const card = event.container.data[event.currentIndex];
      const prevCard = event.container.data[event.currentIndex - 1];
      const nextCard = event.container.data[event.currentIndex + 1];

      this.kanbanFacade.moveCard(card._id, card.listId, prevCard?.order, nextCard?.order).subscribe({
        next: (res) => {
          card.order = res.order;
          this.loadAuditLogs();
        }
      });

    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const card = event.container.data[event.currentIndex];
      const newListId = event.container.id; 
      const prevCard = event.container.data[event.currentIndex - 1];
      const nextCard = event.container.data[event.currentIndex + 1];

      this.kanbanFacade.moveCard(card._id, newListId, prevCard?.order, nextCard?.order).subscribe({
        next: (res) => {
          card.listId = newListId;
          card.order = res.order;
          this.loadAuditLogs();
        },
        error: () => {
          // Revert move on error?
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo mover la tarjeta' });
        }
      });
    }
  }

  onAddCard(listId: string) {
    this.addCard(listId);
  }
}