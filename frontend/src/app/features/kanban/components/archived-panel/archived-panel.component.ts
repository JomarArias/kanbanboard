import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { Kanban } from '../../../../core/models/kanban.model';
import { KanbanFacadeService } from '../../services/kanban-facade.service';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';

const LIST_LABELS: Record<string, string> = {
  todo: 'Por Hacer',
  inProgress: 'En Proceso',
  done: 'Terminado'
};

@Component({
  selector: 'app-archived-panel',
  standalone: true,
  imports: [CommonModule, SidebarModule, ButtonModule],
  styles: [':host { display: contents; }'],
  template: `
    <p-sidebar
      [(visible)]="visible"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      appendTo="body"
      styleClass="archived-panel-sidebar"
      [style]="{ width: '420px' }"
      [modal]="true"
      [dismissible]="false"
      [showCloseIcon]="true">

      <ng-template pTemplate="header">
          <div class="flex items-center gap-2">
              <i class="pi pi-inbox text-xl"></i>
              <h3 class="m-0 font-semibold">Bandeja de Archivados</h3>
          </div>
      </ng-template>

      <div (click)="$event.stopPropagation()">
        <!-- Sin tarjetas -->
        <div *ngIf="cards.length === 0"
             class="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <i class="pi pi-inbox text-4xl"></i>
          <p class="text-sm">No hay tarjetas archivadas</p>
        </div>

        <!-- Lista de tarjetas archivadas -->
        <div class="flex flex-col gap-3 p-1">
          <div *ngFor="let card of cards"
               class="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">

            <!-- Cabecera: título + badge de columna -->
            <div class="flex items-start justify-between gap-2">
              <span class="font-semibold text-gray-800 leading-tight">{{ card.title }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                {{ listLabel(card.listId) }}
              </span>
            </div>

            <!-- Descripción -->
            <p class="text-sm text-gray-500 line-clamp-2">{{ card.task }}</p>

            <!-- Acciones -->
            <div class="flex gap-2 pt-1">
              <p-button
                label="Restaurar"
                icon="pi pi-undo"
                size="small"
                severity="success"
                [text]="true"
                [loading]="loadingId === card._id + '_restore'"
                (onClick)="onRestore(card)">
              </p-button>
              <p-button
                label="Eliminar"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                [text]="true"
                [loading]="loadingId === card._id + '_delete'"
                (onClick)="onDelete(card)">
              </p-button>
            </div>
          </div>
        </div>
      </div>
    </p-sidebar>
  `
})
export class ArchivedPanelComponent implements OnChanges, OnInit, OnDestroy {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cardRestored = new EventEmitter<Kanban>();
  @Output() cardDeleted = new EventEmitter<string>();

  cards: Kanban[] = [];
  loadingId: string | null = null;
  private workspaceSub: Subscription | null = null;

  constructor(
    private facade: KanbanFacadeService,
    private workspaceService: WorkspaceService,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    this.workspaceSub = this.workspaceService.activeWorkspaceId$.subscribe((ws: string | null) => {
      if (ws) {
        // Option 1: Always load on switch
        // this.loadArchived();
        // Option 2: Clear old cards, let visible=true handle the load, 
        // OR load immediately so they are ready
        this.cards = [];
        if (this.visible) {
          this.loadArchived();
        }
      }
    });
  }

  ngOnDestroy() {
    this.workspaceSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.loadArchived();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.visible) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.archived-panel-sidebar')) return;

    this.onVisibleChange(false);
  }

  loadArchived(): void {
    this.facade.getArchivedCards().subscribe({
      next: (cards) => { this.cards = cards; },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los archivados' })
    });
  }

  listLabel(listId: string): string {
    return LIST_LABELS[listId] ?? listId;
  }

  onVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  onRestore(card: Kanban): void {
    this.loadingId = card._id + '_restore';
    this.facade.restoreCard(card._id).subscribe({
      next: (restored) => {
        this.cards = this.cards.filter(c => c._id !== card._id);
        this.cardRestored.emit(restored);
        this.messageService.add({ severity: 'success', summary: 'Restaurada', detail: `"${card.title}" volvió a ${this.listLabel(card.listId)}` });
        this.loadingId = null;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo restaurar la tarjeta' });
        this.loadingId = null;
      }
    });
  }

  onDelete(card: Kanban): void {
    this.loadingId = card._id + '_delete';
    this.facade.deleteCard(card._id).subscribe({
      next: () => {
        this.cards = this.cards.filter(c => c._id !== card._id);
        this.cardDeleted.emit(card._id);
        this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: `"${card.title}" eliminada permanentemente` });
        this.loadingId = null;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la tarjeta' });
        this.loadingId = null;
      }
    });
  }
}
