import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SocketService, ChatMessage } from '../../../../core/services/socket.service';
import { FirebaseAuthService } from '../../../../core/services/firebase-auth.service';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { Subscription, filter, take } from 'rxjs';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, DialogModule],
  styles: [`
    .chat-slide {
      transition: width 0.3s cubic-bezier(.4,0,.2,1),
                  opacity 0.3s cubic-bezier(.4,0,.2,1);
    }
    .tab-arrow {
      transition: transform 0.3s cubic-bezier(.4,0,.2,1);
    }
  `],
  template: `
    <!-- Diálogo de nombre — solo se muestra si Firebase no tiene displayName -->
    <p-dialog
      header="¡Bienvenido al chat!"
      [(visible)]="showUsernameDialog"
      [modal]="true"
      [closable]="false"
      [style]="{ width: '320px' }"
      [draggable]="false"
      [resizable]="false">
      <div class="flex flex-col gap-3 pt-2">
        <p class="text-sm text-gray-500">Ingresá tu nombre para unirte al chat</p>
        <input
          pInputText
          [(ngModel)]="usernameInput"
          placeholder="Tu nombre..."
          maxlength="20"
          (keyup.enter)="confirmUsername()"
          class="w-full" />
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Entrar"
          icon="pi pi-check"
          [disabled]="!usernameInput.trim()"
          (onClick)="confirmUsername()">
        </p-button>
      </ng-template>
    </p-dialog>

    <!-- Wrapper fijo en el lateral derecho -->
    <div class="fixed top-0 right-0 h-full flex items-stretch z-40 pointer-events-none">

      <!-- Pestaña con flecha (siempre visible) -->
      <div class="pointer-events-auto self-start mt-20">
        <button
          (click)="toggleChat()"
          [title]="isOpen ? 'Cerrar chat' : 'Abrir chat'"
          class="flex items-center gap-1 px-2 py-3 bg-white border border-r-0 border-gray-200
                 rounded-l-xl shadow-md hover:bg-gray-50 hover:text-green-500
                 text-gray-500 transition-colors cursor-pointer select-none">
          <i class="pi pi-comments text-base"></i>
          <i class="pi text-xs tab-arrow"
             [class.pi-chevron-left]="!isOpen"
             [class.pi-chevron-right]="isOpen">
          </i>
        </button>
      </div>

      <!-- Panel del chat -->
      <div
        class="chat-slide pointer-events-auto flex flex-col bg-white border-l border-gray-200 shadow-xl h-full"
        [style.width]="isOpen ? '288px' : '0px'"
        [style.opacity]="isOpen ? '1' : '0'"
        [style.overflow]="'hidden'">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0 min-w-[288px]">
          <div class="flex items-center gap-2">
            <i class="pi pi-comments text-green-500"></i>
            <span class="font-semibold text-gray-700">Chat</span>
          </div>
          <span class="text-xs text-gray-400 truncate max-w-[100px]">{{ username }}</span>
        </div>

        <!-- Mensajes -->
        <div #messagesContainer
             class="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 min-w-[288px]">
          <div *ngIf="messages.length === 0"
               class="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
            <i class="pi pi-comments text-3xl"></i>
            <p class="text-sm">Aun no hay mensajes</p>
          </div>

          <div *ngFor="let msg of messages"
               class="flex flex-col"
               [class.items-end]="msg.username === username"
               [class.items-start]="msg.username !== username">

            <div *ngIf="msg.username === username"
                 class="max-w-[85%] bg-green-500 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm break-words">
              {{ msg.text }}
            </div>

            <div *ngIf="msg.username !== username" class="max-w-[85%] flex flex-col gap-0.5">
              <span class="text-xs text-gray-400 px-1">{{ msg.username }}</span>
              <div class="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-3 py-2 text-sm break-words">
                {{ msg.text }}
              </div>
            </div>

            <span class="text-[10px] text-gray-300 px-1 mt-0.5">
              {{ formatTime(msg.timestamp) }}
            </span>
          </div>

          <div *ngFor="let notif of notifications"
               class="text-center text-xs text-gray-400 italic py-1">
            {{ notif }}
          </div>
        </div>

        <!-- Input -->
        <div class="px-3 py-3 border-t border-gray-200 flex gap-2 shrink-0 min-w-[288px]">
          <input
            pInputText
            [(ngModel)]="newMessage"
            placeholder="Escribi un mensaje..."
            maxlength="500"
            (keydown.enter)="sendMessage(); $event.preventDefault()"
            class="flex-1 text-sm rounded-xl" />
          <p-button
            icon="pi pi-send"
            [disabled]="!newMessage.trim()"
            (onClick)="sendMessage()"
            severity="success">
          </p-button>
        </div>
      </div>
    </div>
  `
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  notifications: string[] = [];
  newMessage: string = '';

  username: string = '';
  usernameInput: string = '';
  showUsernameDialog: boolean = false; // empieza oculto — se muestra solo si no hay nombre
  isOpen: boolean = false;

  private subs: Subscription = new Subscription();
  private shouldScrollToBottom = false;
  private currentWorkspaceId: string = '';

  constructor(
    private socketService: SocketService,
    private authService: FirebaseAuthService,
    private workspaceService: WorkspaceService
  ) { }

  ngOnInit(): void {
    // Escuchar el cambio de workspace
    this.subs.add(
      this.workspaceService.activeWorkspaceId$.subscribe(workspaceId => {
        if (workspaceId) {
          this.currentWorkspaceId = workspaceId;
          this.messages = [];
          this.socketService.getChatHistory(workspaceId);

          if (this.username) {
            this.socketService.joinChat(this.username, workspaceId);
          }
        } else {
          this.currentWorkspaceId = '';
          this.messages = [];
        }
      })
    );

    // Esperar a que Firebase restaure la sesión antes de leer el usuario
    this.subs.add(
      this.authService.currentUser$.pipe(
        filter(user => user !== null), // esperar hasta que haya usuario
        take(1)                        // solo la primera emisión
      ).subscribe(user => {
        // Preferir displayName (nombre del registro), fallback a parte del correo
        const name = user!.displayName || user!.email?.split('@')[0] || '';
        if (name) {
          this.username = name;
          this.showUsernameDialog = false;
          if (this.currentWorkspaceId) {
            this.socketService.joinChat(name, this.currentWorkspaceId);
          }
        } else {
          this.showUsernameDialog = true;
        }
      })
    );

    this.subs.add(
      this.socketService.onChatHistory().subscribe((history: ChatMessage[]) => {
        this.messages = history;
        this.shouldScrollToBottom = true;
      })
    );
    this.subs.add(
      this.socketService.onChatMessage().subscribe((msg: ChatMessage) => {
        this.messages.push(msg);
        this.shouldScrollToBottom = true;
      })
    );
    this.subs.add(
      this.socketService.onChatUserJoined().subscribe((data: { username: string }) => {
        this.notifications.push(`${data.username} se unio al chat`);
        setTimeout(() => this.notifications.shift(), 4000);
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.shouldScrollToBottom = true;
  }

  // Solo se usa como fallback si Firebase no tiene displayName
  confirmUsername(): void {
    const name = this.usernameInput.trim();
    if (!name) return;
    this.username = name;
    this.showUsernameDialog = false;
    if (this.currentWorkspaceId) {
      this.socketService.joinChat(name, this.currentWorkspaceId);
    }
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.username || !this.currentWorkspaceId) return;
    this.socketService.sendMessage(this.username, text, this.currentWorkspaceId);
    this.newMessage = '';
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch { }
  }
}