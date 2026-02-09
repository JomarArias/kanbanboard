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
  host: {
    class: 'block w-80 flex-shrink-0 h-full'
  }
})
export class KanbanColumnComponent {
  @Input() title: string = '';
  @Input() listId: string = '';
  @Input() cards: Kanban[] = [];
  @Output() drop = new EventEmitter<CdkDragDrop<Kanban[]>>();
  @Output() addCard = new EventEmitter<void>();
  @Output() editCard = new EventEmitter<Kanban>();
  @Output() deleteCard = new EventEmitter<string>();


  onDrop(event: CdkDragDrop<Kanban[]>) {
    this.drop.emit(event);
  }

  onEditCard(card: Kanban) {
    this.editCard.emit(card);
  }

  onDeleteCard(cardId: string) {
    this.deleteCard.emit(cardId);
  }
}