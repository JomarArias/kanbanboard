import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CardModule } from 'primeng/card';
import { KanbanColumnComponent } from '../../components/kanban-column/kanban-column.component';
import { Kanban } from '../../../../core/models/kanban.model';
import { StorageService } from '../../../../core/services/storage.service';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, CardModule, KanbanColumnComponent],
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

  constructor(private storageService: StorageService) { }

  ngOnInit(): void {
    const savedData = this.storageService.get('boardData');
    if (savedData && Object.keys(savedData).length > 0) {
      this.boardData = savedData;
    }
  }

  private saveData() {
    this.storageService.save('boardData', this.boardData);
  }

  addCard(columnKey: string) {
    if (!this.boardData[columnKey]) return;

    const newCard: Kanban = {
      id: Date.now().toString(),
      title: 'New Card',
      task: 'New Task',
      listId: columnKey,
      order: '0',
      updatedAt: new Date()
    };

    this.boardData[columnKey].push(newCard);
    this.saveData();
  }

  onDeleteCard(cardId: string) {
    if (!confirm('¿Estás seguro de que quieres borrar esta tarjeta?')) return;

    for (const key of Object.keys(this.boardData)) {
      const index = this.boardData[key].findIndex(c => c.id === cardId);
      if (index !== -1) {
        this.boardData[key].splice(index, 1);
        this.saveData();
        return;
      }
    }
  }

  onEditCard(card: Kanban) {
    const newTitle = prompt('Editar título:', card.title);
    if (newTitle && newTitle !== card.title) {
      card.title = newTitle;
      this.saveData();
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
    }

    this.saveData();
  }

  onAddCard(listId: string) {
    this.addCard(listId);
  }
}