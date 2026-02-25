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

  getHeaderColor(): string | null {
    if (this.card?.style?.backgroundType === 'color' && this.card?.style?.backgroundColor) {
      return this.card.style.backgroundColor;
    }
    return null;
  }

  getHeaderImageUrl(): string | null {
    if (this.card?.style?.backgroundType === 'image' && this.card?.style?.backgroundImageUrl) {
      return this.card.style.backgroundImageUrl;
    }
    return null;
  }

  getVisibleLabels() {
    const labels = this.card?.labels ?? [];
    return labels
      .filter((label) => !!label?.name && !!label?.color)
      .slice(0, 4);
  }

private parseDueDateUtcNoon(dueDate: string): Date | null {
  const raw = dueDate.slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return null;

  // 12:00 UTC evita saltos de día por timezone
  const parsed = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

private getTodayUtcNoon(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
}

getDueDateStatus(): 'none' | 'ok' | 'soon' | 'overdue' {
  if (!this.card?.dueDate) return 'none';

  const due = this.parseDueDateUtcNoon(this.card.dueDate);
  if (!due) return 'none';

  const today = this.getTodayUtcNoon();

  if (due.getTime() <= today.getTime()) return 'overdue';


  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / msPerDay);

  if (diffDays <= 2) return 'soon';
  return 'ok';
}

formatDueDate(): string {
  if (!this.card?.dueDate) return '';

  const due = this.parseDueDateUtcNoon(this.card.dueDate);
  if (!due) return '';

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  }).format(due);
}


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
