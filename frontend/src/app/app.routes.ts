import { Routes } from '@angular/router';
import { authGuard, adminRoleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./features/kanban/pages/kanban-board/kanban-board.component').then(m => m.KanbanBoardComponent)
    },
    {
        path: 'admin',
        canActivate: [authGuard, adminRoleGuard],
        loadComponent: () => import('./features/admin/pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
    },
    {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/pages/profile/profile.component').then(m => m.ProfileComponent)
    },
    {
        path: 'kanban',
        redirectTo: '',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: ''
    }
];
