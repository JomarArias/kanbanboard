import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, CdkDragMove } from '@angular/cdk/drag-drop';
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
  @Output() drop = new EventEmitter<CdkDragDrop<Kanban[]>>();
  @Output() addCard = new EventEmitter<void>();
  @Output() editCard = new EventEmitter<Kanban>();
  @Output() deleteCard = new EventEmitter<string>();
  @Output() archiveCard = new EventEmitter<string>();
  @Output() startEditing = new EventEmitter<string>();
  @Output() stopEditing = new EventEmitter<string>();

  private lastAutoScrollTs = 0;


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

  onDragMoved(event: CdkDragMove<Kanban>) {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;

    const now = performance.now();
    if (now - this.lastAutoScrollTs < 16) return;
    this.lastAutoScrollTs = now;

    const dragEl = event.source.element.nativeElement as HTMLElement;
    const scrollContainer = dragEl.closest('.kanban-board-scroll') as HTMLElement | null;
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const pointerX = event.pointerPosition.x;
    const edgeThreshold = 60;
    const maxStep = 18;

    const distLeft = pointerX - rect.left;
    const distRight = rect.right - pointerX;

    if (distLeft < edgeThreshold) {
      const intensity = (edgeThreshold - distLeft) / edgeThreshold;
      scrollContainer.scrollLeft -= Math.ceil(maxStep * intensity);
      return;
    }

    if (distRight < edgeThreshold) {
      const intensity = (edgeThreshold - distRight) / edgeThreshold;
      scrollContainer.scrollLeft += Math.ceil(maxStep * intensity);
    }
  }
}
