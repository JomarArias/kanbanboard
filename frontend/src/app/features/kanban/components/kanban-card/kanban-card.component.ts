import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
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
  host: { class: 'block' }
})
export class KanbanCardComponent {
  @Input() card!: Kanban;
  @Input() editingUser?: string | null;
  @Input() members: any[] = [];
  @Input() isViewer: boolean = false;

  get assignee() {
    return this.members?.find(m => m._id === this.card.assigneeId);
  }
  @Output() edit = new EventEmitter<Kanban>();
  @Output() delete = new EventEmitter<string>();
  @Output() archive = new EventEmitter<string>();
  @Output() startEditing = new EventEmitter<string>();
  @Output() stopEditing = new EventEmitter<string>();

  // Referencia al botón de basura para anclar el popup exactamente ahí
  @ViewChild('deleteBtn', { read: ElementRef }) deleteBtn!: ElementRef;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }

  onEdit() {
    this.edit.emit(this.card);
  }

  onMouseEnter() { this.startEditing.emit(this.card._id); }
  onMouseLeave() { this.stopEditing.emit(this.card._id); }

  onDelete(event: Event) {
    // Usamos el botón mismo como target para que el popup salga justo debajo
    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: '¿Estás seguro de eliminar esta tarjeta?',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Al confirmar → archiva en lugar de eliminar permanentemente
        this.archive.emit(this.card._id);
      }
    });
  }
}