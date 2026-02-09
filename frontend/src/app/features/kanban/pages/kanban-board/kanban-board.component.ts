import { Component } from '@angular/core';
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
export class KanbanBoardComponent {
  //datos de prueba
  todo: Kanban[] = [
    { id: '1', title: 'prueba 1', task: 'tarea 1', listId: 'todo', order: '1', updatedAt: new Date() },
    { id: '2', title: 'prueba 2', task: 'tarea 2', listId: 'todo', order: '2', updatedAt: new Date() },
    { id: '3', title: 'prueba 3', task: 'tarea 3', listId: 'todo', order: '3', updatedAt: new Date() },
  ];

  inProgress: Kanban[] = [
    { id: '4', title: 'prueba 4', task: 'tarea 4', listId: 'inProgress', order: '1', updatedAt: new Date() },
    { id: '5', title: 'prueba 5', task: 'tarea 5', listId: 'inProgress', order: '2', updatedAt: new Date() },
    { id: '6', title: 'prueba 6', task: 'tarea 6', listId: 'inProgress', order: '3', updatedAt: new Date() },
  ];

  done: Kanban[] = [
    { id: '7', title: 'prueba 7', task: 'tarea 7', listId: 'done', order: '1', updatedAt: new Date() },
    { id: '8', title: 'prueba 8', task: 'tarea 8', listId: 'done', order: '2', updatedAt: new Date() },
    { id: '9', title: 'prueba 9', task: 'tarea 9', listId: 'done', order: '3', updatedAt: new Date() },
  ];


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
    }


    console.log('Nueva posición detectada');
  }

  onAddCard(listId: string) {
    console.log('Add card to list:', listId);
  }
}