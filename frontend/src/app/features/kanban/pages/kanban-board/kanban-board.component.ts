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
import { StorageService } from '../../../../core/services/storage.service';
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
  editingCard: Kanban = { id: '', title: '', task: '', listId: '', order: '', updatedAt: new Date() };

  auditLogs: AuditLog[] = [];
  displayAuditLog: boolean = false;
  items: MenuItem[] = [];

  constructor(private storageService: StorageService, private messageService: MessageService) { }

  ngOnInit(): void {
    const savedData = this.storageService.get('boardData');
    if (savedData && Object.keys(savedData).length > 0) {
      this.boardData = savedData;
    }
    const savedLogs = this.storageService.get('auditLogs');
    if (savedLogs) {
      this.auditLogs = savedLogs;
    }

    this.items = [
      {
        icon: 'pi pi-history',
        command: () => {
          this.displayAuditLog = true;
        },
        tooltipOptions: {
          tooltipLabel: 'Ver Historial'
        }
      }
    ];
  }

  private saveData() {
    this.storageService.save('boardData', this.boardData);
    this.storageService.save('auditLogs', this.auditLogs);
  }

  private logAction(action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE', details: string) {
    const log: AuditLog = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: new Date()
    };
    this.auditLogs.unshift(log);
    this.saveData();
  }

  addCard(columnKey: string) {
    if (!this.boardData[columnKey]) return;

    const newCard: Kanban = {
      id: Date.now().toString(),
      title: 'New Card',
      task: 'New Task',
      listId: columnKey,
      updatedAt: new Date(),
      isNew: true,
      order: ''
    };

    this.boardData[columnKey].push(newCard);
    this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta agregada' });
    this.logAction('CREATE', `Tarjeta "${newCard.title}" creada en lista ${columnKey}`);
    this.saveData();
  }

  onDeleteCard(cardId: string) {
    for (const key of Object.keys(this.boardData)) {
      const index = this.boardData[key].findIndex(c => c.id === cardId);
      if (index !== -1) {
        this.boardData[key].splice(index, 1);
        this.saveData();
        this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta eliminada' });
        this.logAction('DELETE', `Tarjeta eliminada de lista ${key}`);
        return;
      }
    }
  }

  onEditCard(card: Kanban) {
    this.editingCard = { ...card };
    this.displayEditDialog = true;
  }

  saveEditedCard() {
    if (!this.editingCard.title.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'El título es obligatorio' });
      return;
    }

    for (const key of Object.keys(this.boardData)) {
      const index = this.boardData[key].findIndex(c => c.id === this.editingCard.id);
      if (index !== -1) {
        this.boardData[key][index] = { ...this.editingCard, updatedAt: new Date() };
        this.saveData();
        this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta actualizada' });
        this.logAction('UPDATE', `Tarjeta "${this.editingCard.title}" actualizada`);
        this.displayEditDialog = false;
        return;
      }
    }
  }

  drop(event: CdkDragDrop<Kanban[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const item = event.container.data[event.currentIndex];
      item.listId = event.container.id;
      this.logAction('MOVE', `Tarjeta "${item.title}" movida a ${event.container.id}`);
    }

    this.saveData();
  }

  onAddCard(listId: string) {
    this.addCard(listId);
  }
}