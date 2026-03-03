import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { Kanban } from '../../../../core/models/kanban.model';
import { KanbanFacadeService } from '../../services/kanban-facade.service';
import { MessageService } from 'primeng/api';

const LIST_LABELS: Record<string, string> = {
  todo:       'Por Hacer',
  inProgress: 'En Proceso',
  done:       'Terminado'
};

@Component({
  selector: 'app-archived-panel',
  standalone: true,
  imports: [CommonModule, DrawerModule, ButtonModule],
  template: `
    <p-drawer
      [(visible)]="visible"
      (visibleChange)="visibleChange.emit($event)"
      header="Bandeja de Archivados"
      position="right"
      [style]="{ width: '380px' }">

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
    </p-drawer>
  `
})
export class ArchivedPanelComponent implements OnChanges {
  @Input()  visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cardRestored  = new EventEmitter<Kanban>();
  @Output() cardDeleted   = new EventEmitter<string>();

  cards: Kanban[] = [];
  loadingId: string | null = null;

  constructor(
    private facade: KanbanFacadeService,
    private messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.loadArchived();
    }
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