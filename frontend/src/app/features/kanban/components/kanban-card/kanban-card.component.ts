import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Kanban } from '../../../../core/models/kanban.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, ConfirmPopupModule],
  templateUrl: './kanban-card.component.html',
  styleUrl: './kanban-card.component.scss',
  host: {
    class: 'block'
  }
})
export class KanbanCardComponent {
  @Input() card!: Kanban;
  @Input() editingUser?: string | null;
  @Output() edit = new EventEmitter<Kanban>();
  @Output() delete = new EventEmitter<string>();
  @Output() startEditing = new EventEmitter<string>();
  @Output() stopEditing = new EventEmitter<string>();

  constructor(private confirmationService: ConfirmationService, private messageService: MessageService) { }

  onEdit() {
    this.edit.emit(this.card);
  }

  onMouseEnter() {
    this.startEditing.emit(this.card._id);
  }

  onMouseLeave() {
    this.stopEditing.emit(this.card._id);
  }

  onDelete(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Estás seguro de eliminar esta tarjeta?',
      header: 'Confirmación',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.delete.emit(this.card._id);
      }
    });
  }
}
