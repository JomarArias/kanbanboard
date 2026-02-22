import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { SocketService } from '../../../../core/services/socket.service';
import { Subscription } from 'rxjs';

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
export class KanbanBoardComponent implements OnInit, OnDestroy {
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

  editingUsers: { [cardId: string]: string } = {};
  private subscriptions: Subscription = new Subscription();
  private myUsername = 'User-' + Math.floor(Math.random() * 1000);

  constructor(
    private kanbanFacade: KanbanFacadeService,
    private messageService: MessageService,
    private socketService: SocketService
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

    this.initSocketListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initSocketListeners() {
    this.subscriptions.add(
      this.socketService.onCardEditingStarted().subscribe((event) => {
        if (event.username !== this.myUsername) {
          this.editingUsers[event.cardId] = event.username;
        }
      })
    );

    this.subscriptions.add(
      this.socketService.onCardEditingStopped().subscribe((event) => {
        delete this.editingUsers[event.cardId];
      })
    );
    

    this.subscriptions.add(
      this.socketService.onCardMoved().subscribe((event) => {
        console.log('Real-time update received (move):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );

    this.subscriptions.add(
      this.socketService.onCardCreated().subscribe((event) => {
        console.log('Real-time update received (create):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );

    this.subscriptions.add(
      this.socketService.onCardUpdated().subscribe((event) => {
        console.log('Real-time update received (update):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );

    this.subscriptions.add(
      this.socketService.onCardDeleted().subscribe((event) => {
        console.log('Real-time update received (delete):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );

    
  }

  onStartEditing(cardId: string) {
    this.socketService.startEditing(cardId, this.myUsername);
  }

  onStopEditing(cardId: string) {
    this.socketService.stopEditing(cardId);
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
    this.onStartEditing(card._id);
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

    const payload: any = {
      title: this.editingCard.title,
      task: this.editingCard.task,
      expectedVersion: this.editingCard.version
    };

    this.kanbanFacade.updateCard(this.editingCard._id, payload).subscribe({
      next: (updatedCard) => {
        this.onStopEditing(updatedCard._id);
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

  archiveDoneCards() {
    const cardsToArchive = [...this.boardData['done']];
    
    if (cardsToArchive.length === 0) return;

    // 1. Limpieza visual inmediata
    this.boardData['done'] = [];

    // 2. Procesar cada tarjeta
    cardsToArchive.forEach(card => {
      // Usamos 'any' para saltar la restricción del modelo Kanban
  
      this.kanbanFacade.deleteCard(card._id).subscribe({
        next: () => {
          // Éxito: No necesitamos hacer nada extra, ya limpiamos la UI
        },
        error: (err) => {
          console.error('Error al archivar:', err);
          // Si falla, devolvemos la tarjeta a la lista para no perder datos
          this.boardData['done'] = [...this.boardData['done'], card];
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'El servidor rechazó el archivado' 
          });
        }
      });
    });

    this.messageService.add({ 
      severity: 'success', 
      summary: 'Limpieza', 
      detail: 'Procesando archivado de tarjetas...' 
    });
  }

  closeEditDialog() {
    if (this.editingCard?._id) {
      this.onStopEditing(this.editingCard._id);
    }
    this.displayEditDialog = false;
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
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo mover la tarjeta' });
        }
      });
    }
  }

  onAddCard(listId: string) {
    this.addCard(listId);
  }

  searchTerm: string = ''; // Nueva variable para el filtro

  // Función para determinar si una tarjeta debe ser visible
  shouldShowCard(card: Kanban): boolean {
    if (!this.searchTerm.trim()) return true;

    const term = this.searchTerm.toLowerCase();
    return (
      card.title.toLowerCase().includes(term) ||
      card.task.toLowerCase().includes(term)
    );
  }
  filterCards(cards: Kanban[]): Kanban[] {
    return cards.filter(card => this.shouldShowCard(card));
  }
}
