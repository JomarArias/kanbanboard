import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Kanban } from '../../../../core/models/kanban.model';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [],
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

  onEdit() {
    this.edit.emit(this.card);
  }

  onDelete() {
    this.delete.emit(this.card.id);
  }
}
