import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

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


    listen<T>(eventName: string): Observable<T> {
        return new Observable<T>((subscriber) => {
            this.socket.on(eventName, (data: T) => {
                subscriber.next(data);
            });

            return () => {
                this.socket.off(eventName);
            };
        });
    }

    // Generic emit method
    emit(eventName: string, data: any): void {
        this.socket.emit(eventName, data);
    }


    onCardMoved() {
        return this.listen<any>('card:moved');
    }

    onCardEditingStarted() {
        return this.listen<{ cardId: string; username: string }>('card:editing:started');
    }

    onCardEditingStopped() {
        return this.listen<{ cardId: string }>('card:editing:stopped');
    }

    joinBoard(boardId: string = 'default') {
    }

    startEditing(cardId: string, username: string) {
        this.emit('card:editing:start', { cardId, username });
    }

    stopEditing(cardId: string) {
        this.emit('card:editing:stop', { cardId });
    }
}
