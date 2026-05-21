import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { firstValueFrom, distinctUntilChanged, map, Subscription } from 'rxjs';
import { FirebaseAuthService } from './firebase-auth.service';
import { RealtimeNotification, SocketService } from './socket.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly auth = inject(FirebaseAuthService);
  private readonly socketService = inject(SocketService);
  private readonly messageService = inject(MessageService);
  private readonly http = inject(HttpClient);

  private started = false;
  private authSubscription?: Subscription;
  private notificationSubscription?: Subscription;
  private currentAuthUid: string | null = null;
  private currentMongoUserId: string | null = null;

  init(): void {
    if (this.started) return;
    this.started = true;

    this.notificationSubscription = this.socketService.onNotificationNew().subscribe((notification) => {
      this.showToast(notification);
    });

    this.authSubscription = this.auth.currentUser$.pipe(
      map((user) => user?.uid ?? null),
      distinctUntilChanged()
    ).subscribe((uid) => {
      void this.handleAuthChange(uid);
    });
  }

  private async handleAuthChange(uid: string | null): Promise<void> {
    if (this.currentMongoUserId && this.currentAuthUid !== uid) {
      this.socketService.leaveUserRoom(this.currentMongoUserId);
      this.currentMongoUserId = null;
    }

    this.currentAuthUid = uid;

    if (!uid) {
      this.currentMongoUserId = null;
      return;
    }

    const mongoUserId = await this.resolveMongoUserId();
    if (!mongoUserId) return;

    if (this.currentMongoUserId && this.currentMongoUserId !== mongoUserId) {
      this.socketService.leaveUserRoom(this.currentMongoUserId);
    }

    this.currentMongoUserId = mongoUserId;
    this.socketService.joinUserRoom(mongoUserId);
  }

  private async resolveMongoUserId(): Promise<string | null> {
    const token = await this.auth.getIdToken();
    if (!token) return null;

    const attempts = 6;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const profile = await firstValueFrom(
          this.http.get<{ _id: string }>(`${environment.apiUrl}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );

        return profile?._id ?? null;
      } catch (error) {
        if (i === attempts - 1) {
          console.error('Failed to resolve Mongo user id for notifications', error);
          return null;
        }

        await this.sleep(500);
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private showToast(notification: RealtimeNotification): void {
    const severity = notification.type === 'card-overdue' ? 'warn' : 'info';

    this.messageService.add({
      severity,
      summary: notification.title,
      detail: notification.message,
      life: 6000
    });
  }
}
