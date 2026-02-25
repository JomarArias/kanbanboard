import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { KanbanColumnComponent } from '../../components/kanban-column/kanban-column.component';
import { Kanban } from '../../../../core/models/kanban.model';
import { KanbanFacadeService } from '../../services/kanban-facade.service';
import { AuditLog } from '../../../../core/models/audit-log.model';
import { AuditLogComponent } from '../../components/audit-log/audit-log.component';
import { SpeedDialModule } from 'primeng/speeddial';
import { MenuItem } from 'primeng/api';
import { SocketService } from '../../../../core/services/socket.service';
import { Subscription } from 'rxjs';
import { KanbanLabel } from '../../../../core/models/kanban.model';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    CardModule,
    KanbanColumnComponent,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FormsModule,
    AuditLogComponent,
    SpeedDialModule
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
  host: {
    class: 'block h-full'
  }
})
export class KanbanBoardComponent implements OnInit, OnDestroy {
  private readonly HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;
  private readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  readonly presetColors: string[] = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#84CC16',
    '#F97316'
  ];

  private getLocalTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

todayIsoDate = this.getLocalTodayIsoDate();



  boardData: { todo: Kanban[]; inProgress: Kanban[]; done: Kanban[];[key: string]: Kanban[] } = {
    todo: [],
    inProgress: [],
    done: [],
  };

  displayEditDialog: boolean = false;
  displayImagePreviewDialog: boolean = false;
  imagePreviewUrl: string | null = null;
  imagePreviewFitMode: 'contain' | 'cover' = 'contain';
  isUploadingImage = false;
  showImageUrlInput = false;
  editingCard: Kanban = {
    _id: '',
    title: '',
    task: '',
    listId: '',
    order: '',
    dueDate: null,
    labels: [],
    style: { backgroundType: 'default', backgroundColor: null, backgroundImageUrl: null }
  };

  auditLogs: AuditLog[] = [];
  displayAuditLog: boolean = false;
  items: MenuItem[] = [];

  editingUsers: { [cardId: string]: string } = {};
  private subscriptions: Subscription = new Subscription();
  private myUsername = 'User-' + Math.floor(Math.random() * 1000);

  constructor(
    private kanbanFacade: KanbanFacadeService,
    private messageService: MessageService,
    private socketService: SocketService
  ) { }

  ngOnInit(): void {
    this.loadCards();
    this.loadAuditLogs();

    this.items = [
      {
        icon: 'pi pi-history',
        command: () => {
          this.displayAuditLog = true;
          this.loadAuditLogs();
        },
        tooltipOptions: {
          tooltipLabel: 'Ver Historial'
        }
      }
    ];

    this.initSocketListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initSocketListeners() {
    this.subscriptions.add(
      this.socketService.onCardEditingStarted().subscribe((event) => {
        if (event.username !== this.myUsername) {
          this.editingUsers[event.cardId] = event.username;
        }
      })
    );

    this.subscriptions.add(
      this.socketService.onCardEditingStopped().subscribe((event) => {
        delete this.editingUsers[event.cardId];
      })
    );

    this.subscriptions.add(
      this.socketService.onCardMoved().subscribe((event) => {
        console.log('Real-time update received (move):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );

    this.subscriptions.add(
      this.socketService.onCardCreated().subscribe((event) => {
        console.log('Real-time update received (create):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );

    this.subscriptions.add(
      this.socketService.onCardUpdated().subscribe((event) => {
        console.log('Real-time update received (update):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );

    this.subscriptions.add(
      this.socketService.onCardDeleted().subscribe((event) => {
        console.log('Real-time update received (delete):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );
  }

  onStartEditing(cardId: string) {
    this.socketService.startEditing(cardId, this.myUsername);
  }

  onStopEditing(cardId: string) {
    this.socketService.stopEditing(cardId);
  }

  loadCards() {
    ['todo', 'inProgress', 'done'].forEach(listId => {
      this.kanbanFacade.getCards(listId).subscribe({
        next: (cards) => {
          this.boardData[listId] = cards;
        },
        error: (err) => console.error(err)
      });
    });
  }

  loadAuditLogs() {
    this.kanbanFacade.getAuditLogs().subscribe({
      next: (logs) => {
        this.auditLogs = logs;
      },
      error: (err) => console.error(err)
    });
  }

  addCard(columnKey: string) {
    const newCard: Partial<Kanban> = {
      title: 'New Card',
      task: 'New Task',
      listId: columnKey
    };

    this.kanbanFacade.createCard(newCard).subscribe({
      next: (card) => {
        this.boardData[columnKey].push(card);
        this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta agregada' });
        this.loadAuditLogs();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la tarjeta' })
    });
  }

  onDeleteCard(cardId: string) {
    this.kanbanFacade.deleteCard(cardId).subscribe({
      next: () => {
        for (const key of Object.keys(this.boardData)) {
          const index = this.boardData[key].findIndex(c => c._id === cardId);
          if (index !== -1) {
            this.boardData[key].splice(index, 1);
            this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta eliminada' });
            this.loadAuditLogs();
            return;
          }
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la tarjeta' })
    });
  }

onEditCard(card: Kanban) {
  this.showImageUrlInput = false;

  this.editingCard = {
    ...card,
    version: card.version ?? 0,
    dueDate: card.dueDate ? card.dueDate.substring(0, 10) : null,

    // Deep copy de labels (array + objetos)
    labels: (card.labels ?? []).map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color
    })),

    // Deep copy de style (objeto)
    style: {
      backgroundType: card.style?.backgroundType ?? 'default',
      backgroundColor: card.style?.backgroundColor ?? null,
      backgroundImageUrl: card.style?.backgroundImageUrl ?? null
    }
  };

  if (this.editingCard.style?.backgroundType === 'color' && !this.editingCard.style.backgroundColor) {
    this.editingCard.style.backgroundColor = '#3B82F6';
  }

  if (this.editingCard.style?.backgroundType === 'image' && !this.editingCard.style.backgroundImageUrl) {
    this.editingCard.style.backgroundImageUrl = '';
  }

  this.displayEditDialog = true;
  this.onStartEditing(card._id);
}


  addLabel(){
      if (!this.editingCard.labels) this.editingCard.labels = [];
      this.editingCard.labels.push({
        id: `label-${Date.now()}`,
        name: '',
        color: '#3B82F6'
      })
    }

  removeLabel(index: number) {
    if (!this.editingCard.labels) return;
    this.editingCard.labels.splice(index, 1);
  }

  private getSafeLabels(): KanbanLabel[] {
    return this.editingCard.labels ?? [];
  }

  selectCardColor(color: string) {
    if (!this.editingCard.style) {
      this.editingCard.style = { backgroundType: 'color', backgroundColor: color, backgroundImageUrl: null };
      return;
    }
    this.editingCard.style.backgroundType = 'color';
    this.editingCard.style.backgroundColor = color;
    this.editingCard.style.backgroundImageUrl = null;
  }

  selectLabelColor(index: number, color: string) {
    if (!this.editingCard.labels || !this.editingCard.labels[index]) return;
    this.editingCard.labels[index].color = color;
  }

  onBackgroundTypeChange(type: string) {
    if (!this.editingCard.style) {
      this.editingCard.style = { backgroundType: 'default', backgroundColor: null, backgroundImageUrl: null };
    }

    const nextType = (type === 'color' || type === 'image') ? type : 'default';
    this.editingCard.style.backgroundType = nextType;

    if (nextType === 'default') {
      this.editingCard.style.backgroundColor = null;
      this.editingCard.style.backgroundImageUrl = null;
      this.showImageUrlInput = false;
      return;
    }

    if (nextType === 'color') {
      this.editingCard.style.backgroundColor = this.editingCard.style.backgroundColor ?? '#3B82F6';
      this.editingCard.style.backgroundImageUrl = null;
      return;
    }

    this.editingCard.style.backgroundColor = null;
    this.editingCard.style.backgroundImageUrl = this.editingCard.style.backgroundImageUrl ?? '';
  }

  removeBackgroundImage() {
    if (!this.editingCard.style) return;
    this.editingCard.style.backgroundImageUrl = null;
  }

  openImagePreview() {
    const imageUrl = this.editingCard.style?.backgroundImageUrl;
    if (!imageUrl) return;
    this.imagePreviewUrl = imageUrl;
    this.imagePreviewFitMode = 'contain';
    this.displayImagePreviewDialog = true;
  }

  closeImagePreview() {
    this.displayImagePreviewDialog = false;
    this.imagePreviewUrl = null;
    this.imagePreviewFitMode = 'contain';
  }

  toggleImagePreviewFitMode() {
    this.imagePreviewFitMode = this.imagePreviewFitMode === 'contain' ? 'cover' : 'contain';
  }

  onBackgroundImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Selecciona un archivo de imagen' });
      input.value = '';
      return;
    }

    if (file.size > this.MAX_IMAGE_SIZE_BYTES) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'La imagen no debe exceder 5MB' });
      input.value = '';
      return;
    }

    this.isUploadingImage = true;

    this.kanbanFacade.uploadCardImage(file).subscribe({
      next: ({ imageUrl }) => {
        if (!this.editingCard.style) {
          this.editingCard.style = { backgroundType: 'image', backgroundColor: null, backgroundImageUrl: imageUrl };
        } else {
          this.editingCard.style.backgroundType = 'image';
          this.editingCard.style.backgroundColor = null;
          this.editingCard.style.backgroundImageUrl = imageUrl;
        }
        this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Imagen subida correctamente' });
      },
      error: (err) => {
        const message = err?.error?.message || 'No se pudo subir la imagen';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
      },
      complete: () => {
        this.isUploadingImage = false;
        input.value = '';
      }
    });
  }

  isValidInput(text: string): boolean {
    const pattern = /^[a-zA-Z0-9\s.,\-_ñÑáéíóúÁÉÍÓÚ?¿!¡]+$/;
    return pattern.test(text);
  }

  private normalizeAndValidateLabels() {
    const labels = this.getSafeLabels();
    const normalized = labels.map((label, index) => ({
      id: label.id?.trim() || `label-${Date.now()}-${index}`,
      name: label.name?.trim() || '',
      color: label.color?.toUpperCase() || ''
    }));

    const hasEmptyName = normalized.some((label) => label.name.length === 0);
    if (hasEmptyName) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Todas las etiquetas deben tener nombre'
      });
      return null;
    }

    const hasInvalidColor = normalized.some((label) => !this.HEX_COLOR_REGEX.test(label.color));
    if (hasInvalidColor) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Todas las etiquetas deben tener color HEX valido'
      });
      return null;
    }

    return normalized;
  }

  private normalizeAndValidateStyle() {
    const backgroundType = this.editingCard.style?.backgroundType ?? 'default';

    if (backgroundType === 'default') {
      return { backgroundType: 'default' as const, backgroundColor: null, backgroundImageUrl: null };
    }

    if (backgroundType === 'color') {
      const backgroundColor = this.editingCard.style?.backgroundColor?.toUpperCase() || '';
      if (!this.HEX_COLOR_REGEX.test(backgroundColor)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'Selecciona un color de tarjeta valido'
        });
        return null;
      }

      return { backgroundType: 'color' as const, backgroundColor, backgroundImageUrl: null };
    }

    const backgroundImageUrl = this.editingCard.style?.backgroundImageUrl?.trim() || '';
    if (!backgroundImageUrl) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'URL obligatoria o carga una imagen'
      });
      return null;
    }

    if (!this.isValidHttpUrl(backgroundImageUrl)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'La URL de imagen debe iniciar con http:// o https://'
      });
      return null;
    }

    return { backgroundType: 'image' as const, backgroundColor: null, backgroundImageUrl };
  }

  private isValidHttpUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  saveEditedCard() {
    if (this.isUploadingImage) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Espera a que termine la subida de imagen' });
      return;
    }

    if (!this.editingCard.title.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'El título es obligatorio' });
      return;
    }

    if (!this.isValidInput(this.editingCard.title)) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El título contiene caracteres inválidos' });
      return;
    }

    if (this.editingCard.task && !this.isValidInput(this.editingCard.task)) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'La tarea contiene caracteres inválidos' });
      return;
    }

if (this.editingCard.dueDate) {
  const [y, m, d] = this.editingCard.dueDate.split('-').map(Number);
  const selected = new Date(y, m - 1, d);
  selected.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selected < today) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: 'No puedes seleccionar una fecha pasada'
    });
    return;
  }
}



    const normalizedLabels = this.normalizeAndValidateLabels();
    if (!normalizedLabels) return;

    const normalizedStyle = this.normalizeAndValidateStyle();
    if (!normalizedStyle) return;

    const normalizedDueDate =
      this.editingCard.dueDate && this.editingCard.dueDate.trim().length > 0
        ? this.editingCard.dueDate
        : null;

    const payload: any = {
      title: this.editingCard.title.trim(),
      task: this.editingCard.task?.trim() ?? '',
      expectedVersion: this.editingCard.version,
      dueDate: normalizedDueDate,
      labels: normalizedLabels,
      style: normalizedStyle

    };

    this.kanbanFacade.updateCard(this.editingCard._id, payload).subscribe({
      next: (updatedCard) => {
        this.onStopEditing(updatedCard._id);
        for (const key of Object.keys(this.boardData)) {
          const index = this.boardData[key].findIndex(c => c._id === updatedCard._id);
          if (index !== -1) {
            this.boardData[key][index] = updatedCard;
            this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta actualizada' });
            this.displayEditDialog = false;
            this.loadAuditLogs();
            return;
          }
        }
      },
      error: (err) => {
        const message = err?.error?.message || 'No se pudo actualizar la tarjeta';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
      }
    });
  }


  closeEditDialog() {
    if (this.editingCard?._id) {
      this.onStopEditing(this.editingCard._id);
    }
    this.displayEditDialog = false;
  }

  drop(event: CdkDragDrop<Kanban[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const card = event.container.data[event.currentIndex];
      const prevCard = event.container.data[event.currentIndex - 1];
      const nextCard = event.container.data[event.currentIndex + 1];

      this.kanbanFacade.moveCard(card._id, card.listId, prevCard?.order, nextCard?.order).subscribe({
        next: (res) => {
          card.order = res.order;
          this.loadAuditLogs();
        }
      });

    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const card = event.container.data[event.currentIndex];
      const newListId = event.container.id;
      const prevCard = event.container.data[event.currentIndex - 1];
      const nextCard = event.container.data[event.currentIndex + 1];

      this.kanbanFacade.moveCard(card._id, newListId, prevCard?.order, nextCard?.order).subscribe({
        next: (res) => {
          card.listId = newListId;
          card.order = res.order;
          this.loadAuditLogs();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo mover la tarjeta' });
        }
      });
    }
  }

  onAddCard(listId: string) {
    this.addCard(listId);
  }





}
