import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, CdkDragMove, CdkDragStart, CdkDragEnd } from '@angular/cdk/drag-drop';
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
  @Output() dragStarted = new EventEmitter<void>();
  @Output() dragEnded = new EventEmitter<void>();
  @Output() startEditing = new EventEmitter<string>();
  @Output() stopEditing = new EventEmitter<string>();

  private activeScrollContainer: HTMLElement | null = null;
  private autoScrollFrameId: number | null = null;
  private autoScrollVelocity = 0;


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

  onDragStarted(event: CdkDragStart<Kanban>) {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    const dragEl = event.source.element.nativeElement as HTMLElement;
    const scrollContainer = dragEl.closest('.kanban-board-scroll') as HTMLElement | null;
    if (!scrollContainer) return;

    this.activeScrollContainer = scrollContainer;
    scrollContainer.classList.add('drag-auto-scrolling');
    this.dragStarted.emit();
  }

  onDragMoved(event: CdkDragMove<Kanban>) {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;

    const dragEl = event.source.element.nativeElement as HTMLElement;
    const scrollContainer =
      this.activeScrollContainer ?? (dragEl.closest('.kanban-board-scroll') as HTMLElement | null);
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const pointerX = event.pointerPosition.x;
    const edgeThreshold = Math.min(120, rect.width * 0.24);
    const maxVelocity = 10;

    const distLeft = pointerX - rect.left;
    const distRight = rect.right - pointerX;
    let nextVelocity = 0;

    if (distLeft < edgeThreshold) {
      const intensity = (edgeThreshold - distLeft) / edgeThreshold;
      nextVelocity = -Math.max(2, maxVelocity * intensity);
    } else if (distRight < edgeThreshold) {
      const intensity = (edgeThreshold - distRight) / edgeThreshold;
      nextVelocity = Math.max(2, maxVelocity * intensity);
    }

    this.activeScrollContainer = scrollContainer;
    this.autoScrollVelocity = nextVelocity;

    if (nextVelocity === 0) {
      this.stopAutoScroll();
      return;
    }

    this.ensureAutoScrollLoop();
  }

  onDragEnded(_event: CdkDragEnd<Kanban>) {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.dragEnded.emit();
    }
    this.clearDragScrollState();
  }

  private ensureAutoScrollLoop() {
    if (this.autoScrollFrameId !== null) return;

    const step = () => {
      if (!this.activeScrollContainer || this.autoScrollVelocity === 0) {
        this.stopAutoScroll();
        return;
      }

      const container = this.activeScrollContainer;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      const nextScrollLeft = Math.min(
        maxScrollLeft,
        Math.max(0, container.scrollLeft + this.autoScrollVelocity)
      );

      container.scrollLeft = nextScrollLeft;

      if (nextScrollLeft === 0 || nextScrollLeft === maxScrollLeft) {
        this.stopAutoScroll();
        return;
      }

      this.autoScrollFrameId = window.requestAnimationFrame(step);
    };

    this.autoScrollFrameId = window.requestAnimationFrame(step);
  }

  private stopAutoScroll() {
    if (this.autoScrollFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.autoScrollFrameId);
    }
    this.autoScrollFrameId = null;
    this.autoScrollVelocity = 0;
  }

  private clearDragScrollState() {
    this.stopAutoScroll();

    if (this.activeScrollContainer) {
      this.activeScrollContainer.classList.remove('drag-auto-scrolling');
    }

    this.activeScrollContainer = null;
  }
}
