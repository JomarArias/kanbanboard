import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Kanban } from '../../../../core/models/kanban.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [ButtonModule, ToastModule, ConfirmPopupModule],
  templateUrl: './kanban-card.component.html',
  styleUrl: './kanban-card.component.scss',
  host: {
    class: 'block'
  }
})
export class KanbanCardComponent {
  @Input() card!: Kanban;
  @Output() edit = new EventEmitter<Kanban>();
  @Output() delete = new EventEmitter<string>();

  constructor(private confirmationService: ConfirmationService, private messageService: MessageService) { }

  onEdit() {
    this.edit.emit(this.card);
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
