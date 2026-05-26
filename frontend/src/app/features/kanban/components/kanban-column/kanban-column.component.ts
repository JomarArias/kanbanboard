import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';
import { Kanban } from '../../../../core/models/kanban.model';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, DragDropModule, ButtonModule, KanbanCardComponent],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.scss',
  host: {
    class: 'block w-full md:w-80 flex-shrink-0 h-full'
  }
})
export class KanbanColumnComponent {
  @Input() title: string = '';
  @Input() listId: string = '';
  @Input() cards: Kanban[] = [];
  @Input() labelsExpandedGlobal = false;
  @Output() toggleLabelsExpandedGlobal = new EventEmitter<void>();
  @Input() editingUsers: { [key: string]: string } = {};
  @Input() members: any[] = [];
  @Input() isLoading: boolean = false;
  @Input() isViewer: boolean = false;
  @Input() workflowEmailPreferences: { [cardId: string]: boolean } = {};
  @Input() processingCardIds: { [cardId: string]: boolean } = {};
  @Input() processingWorkflowCardIds: { [cardId: string]: boolean } = {};
  @Output() drop = new EventEmitter<CdkDragDrop<Kanban[]>>();
  @Output() addCard = new EventEmitter<void>();
  @Output() editCard = new EventEmitter<Kanban>();
  @Output() deleteCard = new EventEmitter<string>();
  @Output() archiveCard = new EventEmitter<string>();
  @Output() workflowEmailToggle = new EventEmitter<string>();
  @Output() startEditing = new EventEmitter<string>();
  @Output() stopEditing = new EventEmitter<string>();


  trackByCard(index: number, card: Kanban): string {
    return card._id;
  }

  onDrop(event: CdkDragDrop<Kanban[]>) {
    this.drop.emit(event);
  }

  onEditCard(card: Kanban) {
    this.editCard.emit(card);
  }

  onDeleteCard(cardId: string) {
    this.deleteCard.emit(cardId);
  }
  onArchiveCard(cardId: string) {
    this.archiveCard.emit(cardId);
  }

  onWorkflowEmailToggle(cardId: string) {
    this.workflowEmailToggle.emit(cardId);
  }

  isWorkflowEmailEnabled(cardId: unknown): boolean {
    return this.workflowEmailPreferences[this.normalizeCardId(cardId)] !== false;
  }

  isCardProcessing(cardId: unknown): boolean {
    return this.processingCardIds[this.normalizeCardId(cardId)] === true;
  }

  isWorkflowProcessing(cardId: unknown): boolean {
    return this.processingWorkflowCardIds[this.normalizeCardId(cardId)] === true;
  }

  private normalizeCardId(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);

    if (value && typeof value === 'object') {
      const maybe = value as { _id?: unknown; $oid?: unknown; toString?: () => string };
      if (maybe._id !== undefined) return this.normalizeCardId(maybe._id);
      if (maybe.$oid !== undefined) return this.normalizeCardId(maybe.$oid);

      const str = maybe.toString?.();
      if (str && str !== '[object Object]') return str;
    }

    return '';
  }
}
