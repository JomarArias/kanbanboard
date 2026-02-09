import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'kanban',
        pathMatch: 'full'
    },
    {
        path: 'kanban',
        loadComponent: () => import('./features/kanban/pages/kanban-board/kanban-board.component').then(m => m.KanbanBoardComponent)
    }
];
