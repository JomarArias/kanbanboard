import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService, MenuItem } from 'primeng/api';
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
import { Kanban, KanbanLabel, KanbanAssigneeRef } from '../../../../core/models/kanban.model';
import { KanbanFacadeService } from '../../services/kanban-facade.service';
import { AuditLog } from '../../../../core/models/audit-log.model';
import { AuditLogComponent } from '../../components/audit-log/audit-log.component';
import { ArchivedPanelComponent } from '../../components/archived-panel/archived-panel.component';
import { SpeedDialModule } from 'primeng/speeddial';
import { SocketService } from '../../../../core/services/socket.service';
import { Subject, Subscription } from 'rxjs';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { Auth } from '@angular/fire/auth';
import { authState } from '@angular/fire/auth';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ColorPickerModule } from 'primeng/colorpicker';

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
    ArchivedPanelComponent,
    SpeedDialModule,
    DropdownModule,
    ToastModule,
    TooltipModule,
    DatePickerModule,
    SelectButtonModule,
    ColorPickerModule
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
  host: { class: 'block h-full' }
})
export class KanbanBoardComponent implements OnInit, OnDestroy {
  private readonly HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;
  private readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  readonly backgroundTypeOptions = [
    { label: 'Ninguno', value: 'default' },
    { label: 'Color', value: 'color' },
    { label: 'Imagen', value: 'image' }
  ];

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

  private formatLocalDateToYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseYmdToLocalDate(ymd: string): Date | null {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  onDueDateChange(value: Date | null) {
    this.selectedDueDate = value;
    this.editingCard.dueDate = value ? this.formatLocalDateToYmd(value) : null;
  }

  labelsExpandedGlobal = false;

  toggleLabelsExpandedGlobal() {
    this.labelsExpandedGlobal = !this.labelsExpandedGlobal;
  }

  todayIsoDate = this.getLocalTodayIsoDate();

  selectedDueDate: Date | null = null;
  todayDate: Date = new Date();


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
  isSavingEditCard = false;
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

  // ── BANDEJA DE ARCHIVADOS ───────────────────────────────────────────────────
  displayArchivedPanel: boolean = false;
  // ───────────────────────────────────────────────────────────────────────────

  items: MenuItem[] = [];

  editingUsers: { [cardId: string]: string } = {};
  private subscriptions: Subscription = new Subscription();
  private auth = inject(Auth);
  private myUsername = 'User-' + Math.floor(Math.random() * 1000);

  searchSubject = new Subject<string>();
  isSearching = false;
  isLoadingCards = false;
  searchResults: Kanban[] | null = null;
  searchTerm = '';
  destroy$ = new Subject<void>();
  activeWorkspaceId = '';
  workspaceMembers: any[] = [];
  onlineUsers: any[] = [];
  myUserId?: string;
  myRole?: string;
  _lastCreatedCardId?: string;
  isViewer: boolean = false;

  private normalizeAssigneeId(value: Kanban['assigneeId']): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    const ref = value as KanbanAssigneeRef;
    return ref?._id || undefined;
  }

  constructor(
    private kanbanFacade: KanbanFacadeService,
    private messageService: MessageService,
    private socketService: SocketService,
    private workspaceService: WorkspaceService
  ) { }

  ngOnInit(): void {
    this.todayDate.setHours(0, 0, 0, 0);
    this.loadCards();
    this.loadAuditLogs();
    this.initSearch();

    this.items = [
      {
        icon: 'pi pi-history',
        command: () => {
          this.displayAuditLog = true;
          this.loadAuditLogs();
        },
        tooltipOptions: { tooltipLabel: 'Ver Historial', tooltipPosition: 'left' }
      },
      {
        icon: 'pi pi-inbox',
        command: () => { this.displayArchivedPanel = true; },
        tooltipOptions: { tooltipLabel: 'Bandeja de Archivados', tooltipPosition: 'left' }
      }
    ];

    this.subscriptions.add(
      this.workspaceService.activeWorkspaceId$.subscribe((workspaceId: any) => {
        if (workspaceId) {
          this.activeWorkspaceId = workspaceId;
          this.socketService.joinWorkspace(workspaceId, this.myUsername, this.myUserId || undefined);
          this.loadCards();
          this.loadAuditLogs();
          this.loadMembers();
          const ws = this.workspaceService.getWorkspaceById(workspaceId);
          if (ws) this.myRole = ws.myRole || (ws.isOwner ? 'admin' : 'editor');

        } else {
          this.activeWorkspaceId = '';
          this.boardData = { todo: [], inProgress: [], done: [] };
          this.auditLogs = [];
          this.workspaceMembers = [];
        }
      })
    );

    this.initSocketListeners();


  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── BÚSQUEDA CON DEBOUNCE ─────────────────────────────────────────────────
  initSearch(): void {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!term.trim()) {
          this.searchResults = null;
          this.isSearching = false;
          return [];
        }
        this.isSearching = true;
        return this.kanbanFacade.searchCards(term);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (cards) => { this.searchResults = cards; this.isSearching = false; },
      error: () => {
        this.isSearching = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo realizar la búsqueda' });
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  filterCards(cards: Kanban[], listId: string): Kanban[] {
    if (this.searchResults === null) return cards;
    return this.searchResults.filter(c => c.listId === listId);
  }
  // ──────────────────────────────────────────────────────────────────────────

  initSocketListeners() {
    // Authoritative presence list from server
    this.subscriptions.add(
      this.socketService.onWorkspaceUsers().subscribe((event) => {
        if (event.workspaceId === this.activeWorkspaceId) {
          this.onlineUsers = event.users;
        }
      })
    );

    // Toast-only notifications (no longer mutate onlineUsers)
    this.subscriptions.add(
      this.socketService.onUserJoined().subscribe((event) => {
        if (event.username !== this.myUsername) {
          this.messageService.add({ severity: 'info', summary: 'Conectado', detail: `${event.username} se unió al proyecto`, icon: 'pi pi-user-plus' });
        }
      })
    );

    this.subscriptions.add(
      this.socketService.onUserLeft().subscribe((event) => {
        if (event.username !== this.myUsername) {
          this.messageService.add({ severity: 'warn', summary: 'Desconectado', detail: `${event.username} salió del proyecto`, icon: 'pi pi-user-minus' });
        }
      })
    );

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
      this.socketService.onCardMoved().subscribe(() => { this.loadCards(); this.loadAuditLogs(); })
    );
    this.subscriptions.add(
      this.socketService.onCardCreated().subscribe((event) => {
        console.log('Real-time update received (create):', event);
        this.loadCards();
        this.loadAuditLogs();
      })
    );
    this.subscriptions.add(
      this.socketService.onCardUpdated().subscribe(() => { this.loadCards(); this.loadAuditLogs(); })
    );
    this.subscriptions.add(
      this.socketService.onCardDeleted().subscribe(() => { this.loadCards(); this.loadAuditLogs(); })
    );
  }

  loadMembers() {
    if (!this.activeWorkspaceId) return;
    this.workspaceService.getWorkspaceMembers(this.activeWorkspaceId).subscribe({
      next: (members: any) => this.workspaceMembers = members,
      error: (err: any) => console.error(err)
    });
  }

  get onlineUsersArray(): string[] {
    return this.onlineUsers.map(u => u.username);
  }

  onStartEditing(cardId: string) {
    this.socketService.startEditing(cardId, this.myUsername, this.activeWorkspaceId || '');
  }

  onStopEditing(cardId: string) {
    this.socketService.stopEditing(cardId, this.activeWorkspaceId || '');
  }

  loadCards() {
    this.isLoadingCards = true;
    let completedRequests = 0;
    const columns = ['todo', 'inProgress', 'done'];

    columns.forEach(listId => {
      this.kanbanFacade.getCards(listId).subscribe({
        next: (cards) => {
          this.boardData[listId] = cards.map((card) => ({
            ...card,
            assigneeId: this.normalizeAssigneeId(card.assigneeId)
          }));
        },
        error: (err) => console.error(err),
        complete: () => {
          completedRequests++;
          if (completedRequests === columns.length) {
            this.isLoadingCards = false;
          }
        }
      });
    });
  }

  loadAuditLogs() {
    this.kanbanFacade.getAuditLogs().subscribe({
      next: (logs) => { this.auditLogs = logs; },
      error: (err) => console.error(err)
    });
  }

  addCard(columnKey: string) {
    const newCard: Partial<Kanban> = { title: 'Nueva tarjeta', task: 'Nueva tarea', listId: columnKey };
    this.kanbanFacade.createCard(newCard).subscribe({
      next: (card) => {
        this._lastCreatedCardId = card._id;
        this.boardData[columnKey] = [...this.boardData[columnKey], card];
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
      assigneeId: this.normalizeAssigneeId(card.assigneeId),
      dueDate: card.dueDate ? card.dueDate.substring(0, 10) : null,

      labels: (card.labels ?? []).map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color
      })),

      style: {
        backgroundType: card.style?.backgroundType ?? 'default',
        backgroundColor: card.style?.backgroundColor ?? null,
        backgroundImageUrl: card.style?.backgroundImageUrl ?? null
      }
    };

    this.selectedDueDate = this.editingCard.dueDate
      ? this.parseYmdToLocalDate(this.editingCard.dueDate)
      : null;


    if (this.editingCard.style?.backgroundType === 'color' && !this.editingCard.style.backgroundColor) {
      this.editingCard.style.backgroundColor = '#3B82F6';
    }

    if (this.editingCard.style?.backgroundType === 'image' && !this.editingCard.style.backgroundImageUrl) {
      this.editingCard.style.backgroundImageUrl = '';
    }

    this.displayEditDialog = true;
    this.onStartEditing(card._id);
  }


  addLabel() {
    if (!this.editingCard.labels) this.editingCard.labels = [];
    this.editingCard.labels.unshift({
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
    const workspaceId = this.activeWorkspaceId || this.workspaceService.getActiveWorkspaceId();
    if (!workspaceId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Workspace requerido',
        detail: 'Selecciona un workspace antes de subir imágenes'
      });
      return;
    }

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
        this.isUploadingImage = false;
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
    if (this.isSavingEditCard) return;
    const workspaceId = this.activeWorkspaceId || this.workspaceService.getActiveWorkspaceId();
    if (!workspaceId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Workspace requerido',
        detail: 'Selecciona un workspace antes de guardar cambios'
      });
      return;
    }

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
    if (this.selectedDueDate) {
      const selected = new Date(this.selectedDueDate);
      selected.setHours(0, 0, 0, 0);

      const today = new Date(this.todayDate);
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

    const normalizedDueDate = this.editingCard.dueDate ?? null;

    const payload: any = {
      title: this.editingCard.title.trim(),
      task: this.editingCard.task?.trim() ?? '',
      expectedVersion: this.editingCard.version,
      dueDate: normalizedDueDate,
      labels: normalizedLabels,
      style: normalizedStyle,
      assigneeId: this.normalizeAssigneeId(this.editingCard.assigneeId) ?? null
    };
    this.isSavingEditCard = true;
    this.kanbanFacade.updateCard(this.editingCard._id, payload)
      .pipe(finalize(() => { this.isSavingEditCard = false; }))
      .subscribe({
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

  // ── LIMPIAR TERMINADO → ARCHIVAR ───────────────────────────────────────────
  onArchiveCard(cardId: string) {
    this.kanbanFacade.archiveCard(cardId).subscribe({
      next: () => {
        // Find and remove the card from local board data
        for (const key of Object.keys(this.boardData)) {
          const index = this.boardData[key].findIndex(c => c._id === cardId);
          if (index !== -1) {
            this.boardData[key].splice(index, 1);
            this.messageService.add({ severity: 'success', summary: 'Correcto', detail: 'Tarjeta archivada' });
            this.loadAuditLogs();
            return;
          }
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo archivar la tarjeta' })
    });
  }

  archiveDoneCards() {
    const cardsToArchive = [...this.boardData['done']];
    if (cardsToArchive.length === 0) return;

    // Limpieza visual inmediata
    this.boardData['done'] = [];

    cardsToArchive.forEach(card => {
      this.kanbanFacade.archiveCard(card._id).subscribe({
        error: () => {
          // Si falla, devolvemos la tarjeta
          this.boardData['done'] = [...this.boardData['done'], card];
          this.messageService.add({ severity: 'error', summary: 'Error', detail: `No se pudo archivar "${card.title}"` });
        }
      });
    });

    this.messageService.add({ severity: 'success', summary: 'Archivado', detail: `${cardsToArchive.length} tarjeta(s) enviadas a la bandeja` });
    this.loadAuditLogs();
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── EVENTOS DEL DRAWER ─────────────────────────────────────────────────────
  onCardRestored(card: Kanban) {
    // Agrega la tarjeta restaurada a su columna original
    this.boardData[card.listId] = [...this.boardData[card.listId], card]
      .sort((a, b) => a.order.localeCompare(b.order));
    this.loadAuditLogs();
  }

  onArchivedCardDeleted(cardId: string) {
    this.loadAuditLogs();
  }
  // ──────────────────────────────────────────────────────────────────────────

  closeEditDialog() {
    if (this.editingCard?._id) this.onStopEditing(this.editingCard._id);
    this.displayEditDialog = false;
  }

  drop(event: CdkDragDrop<Kanban[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }

    const card = event.item.data as Kanban;
    const targetListId = event.container.id;
    const prevCard = event.container.data[event.currentIndex - 1];
    const nextCard = event.container.data[event.currentIndex + 1];

    let prevOrder = prevCard?.order;
    let nextOrder = nextCard?.order;

    // If the visible target list is filtered, use full boardData as fallback
    // so backend always receives at least one neighbor when destination has cards.
    const fullTargetCards = (this.boardData[targetListId] || []).filter(c => c._id !== card._id);
    if (!prevOrder && !nextOrder && fullTargetCards.length > 0) {
      if (event.currentIndex <= 0) {
        nextOrder = fullTargetCards[0]?.order;
      } else {
        prevOrder = fullTargetCards[fullTargetCards.length - 1]?.order;
      }
    }

    this.kanbanFacade.moveCard(card._id, targetListId, prevOrder, nextOrder).subscribe({
      next: (res) => {
        card.listId = targetListId;
        card.order = res.order;
        this.loadCards();
        this.loadAuditLogs();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo mover la tarjeta' });
        this.loadCards();
      }
    });
  }

  onAddCard(listId: string) {
    this.addCard(listId);
  }
}
