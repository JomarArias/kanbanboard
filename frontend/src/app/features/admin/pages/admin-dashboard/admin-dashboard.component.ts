import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService, AdminUser, AdminAuditLog, AdminWorkspace } from '../../../../core/services/admin.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { PanelModule } from 'primeng/panel';

type DialogType = 'none' | 'createBoard' | 'editBoard' | 'assignMember';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        CommonModule, FormsModule, RouterModule,
        TableModule, TabViewModule, ButtonModule, DropdownModule,
        TagModule, ToastModule, ConfirmDialogModule, AvatarModule,
        InputTextModule, CalendarModule, TooltipModule, DialogModule, PanelModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
    private adminService = inject(AdminService);
    private messageService = inject(MessageService);
    private confirmService = inject(ConfirmationService);

    users: AdminUser[] = [];
    auditLogs: AdminAuditLog[] = [];
    workspaces: AdminWorkspace[] = [];
    loadingUsers = false;
    loadingLogs = false;
    loadingWorkspaces = false;
    savingDialog = false;

    // ─── Single dialog state (prevents stacking) ────────────────────────────────
    activeDialog: DialogType = 'none';

    // Create board
    newBoardName = '';
    newBoardOwnerUserId = '';

    // Edit board
    editingBoard: { _id: string; name: string } = { _id: '', name: '' };

    // Assign member
    assigningWorkspace: AdminWorkspace | null = null;
    assignUserId = '';
    assignRole = 'editor';

    // Audit log filters
    filterAction: string | null = null;
    filterDateFrom: Date | null = null;
    filterDateTo: Date | null = null;

    actionOptions = [
        { label: 'Todos', value: null },
        { label: 'Crear', value: 'CREATE' },
        { label: 'Actualizar', value: 'UPDATE' },
        { label: 'Eliminar', value: 'DELETE' },
        { label: 'Mover', value: 'MOVE' }
    ];

    roleOptions = [
        { label: 'Miembro', value: 'member' },
        { label: 'Admin', value: 'admin' }
    ];

    workspaceRoleOptions = [
        { label: 'Editor', value: 'editor' },
        { label: 'Visitante', value: 'viewer' },
        { label: 'Admin', value: 'admin' }
    ];

    get isDialogOpen(): boolean { return this.activeDialog !== 'none'; }

    ngOnInit(): void {
        this.loadUsers();
        this.loadAuditLogs();
        this.loadWorkspaces();
    }

    // ─── Dialog helpers ──────────────────────────────────────────────────────────
    openDialog(type: DialogType) { this.activeDialog = type; }
    closeDialog() { this.activeDialog = 'none'; this.savingDialog = false; }

    // ─── Users ──────────────────────────────────────────────────────────────────
    loadUsers() {
        this.loadingUsers = true;
        this.adminService.getUsers().subscribe({
            next: (u) => { this.users = u; this.loadingUsers = false; },
            error: () => this.loadingUsers = false
        });
    }

    onRoleChange(user: AdminUser, role: 'admin' | 'member') {
        this.adminService.updateUserRole(user._id, role).subscribe({
            next: (u) => {
                user.role = u.role;
                this.messageService.add({ severity: 'success', summary: 'Rol actualizado', detail: `${user.name} → ${role}` });
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el rol' })
        });
    }

    confirmDeactivate(user: AdminUser) {
        this.confirmService.confirm({
            message: `¿Desactivar la cuenta de <strong>${user.name}</strong>?`,
            header: 'Confirmar Desactivación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Desactivar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.adminService.deactivateUser(user._id).subscribe({
                next: () => { user.isDeleted = true; this.messageService.add({ severity: 'warn', summary: 'Desactivado', detail: user.name }); },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error' })
            })
        });
    }

    reactivateUser(user: AdminUser) {
        this.adminService.reactivateUser(user._id).subscribe({
            next: () => { user.isDeleted = false; this.messageService.add({ severity: 'success', summary: 'Reactivado', detail: user.name }); },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar' })
        });
    }

    // ─── Workspaces ─────────────────────────────────────────────────────────────
    loadWorkspaces() {
        this.loadingWorkspaces = true;
        this.adminService.getWorkspaces().subscribe({
            next: (ws) => { this.workspaces = ws; this.loadingWorkspaces = false; },
            error: () => this.loadingWorkspaces = false
        });
    }

    openCreateBoard() {
        this.newBoardName = '';
        this.newBoardOwnerUserId = '';
        this.openDialog('createBoard');
    }

    submitCreateBoard() {
        if (!this.newBoardName.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El nombre es obligatorio' });
            return;
        }
        this.savingDialog = true;
        this.adminService.createWorkspace(
            this.newBoardName.trim(),
            this.newBoardOwnerUserId || undefined
        ).subscribe({
            next: (ws: any) => {
                this.workspaces.unshift({ ...ws, members: [] });
                this.messageService.add({ severity: 'success', summary: 'Creado', detail: `Tablero "${ws.name}" creado` });
                this.closeDialog();
            },
            error: (err: any) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al crear' });
                this.savingDialog = false;
            }
        });
    }

    openEditBoard(ws: AdminWorkspace) {
        this.editingBoard = { _id: ws._id, name: ws.name };
        this.openDialog('editBoard');
    }

    saveBoard() {
        if (!this.editingBoard.name.trim()) return;
        this.savingDialog = true;
        this.adminService.updateWorkspace(this.editingBoard._id, this.editingBoard.name).subscribe({
            next: (updated) => {
                const idx = this.workspaces.findIndex(w => w._id === updated._id);
                if (idx !== -1) this.workspaces[idx].name = updated.name;
                this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Tablero actualizado' });
                this.closeDialog();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
                this.savingDialog = false;
            }
        });
    }

    confirmDeleteWorkspace(ws: AdminWorkspace) {
        this.confirmService.confirm({
            message: `¿Eliminar permanentemente el tablero <strong>${ws.name}</strong>? Esta acción no se puede deshacer.`,
            header: 'Eliminar Tablero',
            icon: 'pi pi-trash',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.adminService.deleteWorkspace(ws._id).subscribe({
                next: () => {
                    this.workspaces = this.workspaces.filter(w => w._id !== ws._id);
                    this.messageService.add({ severity: 'warn', summary: 'Eliminado', detail: ws.name });
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' })
            })
        });
    }

    openAssignDialog(ws: AdminWorkspace) {
        this.assigningWorkspace = ws;
        this.assignUserId = '';
        this.assignRole = 'editor';
        this.openDialog('assignMember');
    }

    confirmAssign() {
        if (!this.assigningWorkspace || !this.assignUserId) {
            this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Selecciona un usuario' });
            return;
        }
        this.savingDialog = true;
        this.adminService.addMemberToWorkspace(this.assigningWorkspace._id, this.assignUserId, this.assignRole).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Asignado', detail: 'Usuario añadido al tablero' });
                this.closeDialog();
                this.loadWorkspaces();
            },
            error: (err: any) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo asignar' });
                this.savingDialog = false;
            }
        });
    }

    removeMemberFromBoard(ws: AdminWorkspace, member: any) {
        this.confirmService.confirm({
            message: `¿Quitar a <strong>${member.name}</strong> del tablero <strong>${ws.name}</strong>?`,
            header: 'Quitar Miembro',
            icon: 'pi pi-user-minus',
            acceptLabel: 'Quitar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.adminService.removeMemberFromWorkspace(ws._id, member._id).subscribe({
                next: () => {
                    ws.members = ws.members.filter(m => m._id !== member._id);
                    this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `${member.name} removido del tablero` });
                }
            })
        });
    }

    // ─── Audit Logs ─────────────────────────────────────────────────────────────
    loadAuditLogs() {
        this.loadingLogs = true;
        const filters: any = { limit: 200 };
        if (this.filterAction) filters.action = this.filterAction;
        if (this.filterDateFrom) filters.from = this.filterDateFrom.toISOString();
        if (this.filterDateTo) filters.to = this.filterDateTo.toISOString();
        this.adminService.getAuditLogs(filters).subscribe({
            next: (logs) => { this.auditLogs = logs; this.loadingLogs = false; },
            error: () => this.loadingLogs = false
        });
    }

    getActionSeverity(action: string): 'success' | 'info' | 'danger' | 'warn' | 'secondary' {
        const map: Record<string, any> = { CREATE: 'success', UPDATE: 'info', DELETE: 'danger', MOVE: 'warn' };
        return map[action] || 'secondary';
    }

    getUserById(id: string): AdminUser | undefined {
        return this.users.find(u => u._id === id);
    }

    avatarLabel(name: string) {
        return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    }
}
