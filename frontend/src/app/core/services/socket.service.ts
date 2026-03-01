import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ChatMessage = {
  id: string;
  username: string;
  text: string;
  timestamp: string;
};

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  // @ts-ignore
  private backendUrl = environment.socketUrl || 'http://localhost:3000';

  constructor() {
    this.socket = io(this.backendUrl);

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  get socketId(): string {
    return this.socket.id ?? '';
  }

  listen<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.socket.on(eventName, (data: T) => subscriber.next(data));
      return () => { this.socket.off(eventName); };
    });
  }

  emit(eventName: string, data: any): void {
    this.socket.emit(eventName, data);
  }

  // ── Card events ────────────────────────────────────────────────────────────
  onCardMoved()         { return this.listen<any>('card:moved'); }
  onCardEditingStarted(){ return this.listen<{ cardId: string; username: string }>('card:editing:started'); }
  onCardEditingStopped(){ return this.listen<{ cardId: string }>('card:editing:stopped'); }
  onCardCreated()       { return this.listen<any>('card:created'); }
  onCardUpdated()       { return this.listen<any>('card:updated'); }
  onCardDeleted()       { return this.listen<{ _id: string }>('card:deleted'); }

  startEditing(cardId: string, username: string) { this.emit('card:editing:start', { cardId, username }); }
  stopEditing(cardId: string)                    { this.emit('card:editing:stop', { cardId }); }
  joinBoard(boardId: string = 'default')         {}

  // ── Chat events ────────────────────────────────────────────────────────────
  joinChat(username: string): void {
    this.emit('chat:join', { username });
  }

  sendMessage(username: string, text: string): void {
    this.emit('chat:message', { username, text });
  }

  onChatMessage(): Observable<ChatMessage> {
    return this.listen<ChatMessage>('chat:message');
  }

  onChatHistory(): Observable<ChatMessage[]> {
    return this.listen<ChatMessage[]>('chat:history');
  }

  onChatUserJoined(): Observable<{ username: string }> {
    return this.listen<{ username: string }>('chat:user:joined');
  }
}