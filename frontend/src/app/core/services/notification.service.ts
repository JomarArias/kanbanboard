import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, firstValueFrom, distinctUntilChanged, map, Subscription } from 'rxjs';
import { FirebaseAuthService } from './firebase-auth.service';
import { RealtimeNotification, SocketService } from './socket.service';
import { environment } from '../../../environments/environment';

export type NotificationItem = {
  _id: string;
  userId: string;
  cardId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

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
  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  init(): void {
    if (this.started) return;
    this.started = true;

    this.notificationSubscription = this.socketService.onNotificationNew().subscribe((notification) => {
      this.appendRealtimeNotification({
        _id: notification.id,
        userId: this.currentMongoUserId || '',
        cardId: notification.cardId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: false,
        createdAt: notification.createdAt,
        updatedAt: notification.createdAt
      });
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
      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);
      return;
    }

    const mongoUserId = await this.resolveMongoUserId();
    if (!mongoUserId) return;

    if (this.currentMongoUserId && this.currentMongoUserId !== mongoUserId) {
      this.socketService.leaveUserRoom(this.currentMongoUserId);
    }

    this.currentMongoUserId = mongoUserId;
    this.socketService.joinUserRoom(mongoUserId);
    await this.loadNotifications();
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

  async loadNotifications(): Promise<void> {
    const token = await this.auth.getIdToken();
    if (!token) return;

    try {
      const notifications = await firstValueFrom(
        this.http.get<NotificationItem[]>(`${environment.apiUrl}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      this.notificationsSubject.next(notifications);
      this.unreadCountSubject.next(notifications.filter((notification) => !notification.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const token = await this.auth.getIdToken();
    if (!token) return;

    try {
      const updated = await firstValueFrom(
        this.http.patch<NotificationItem>(`${environment.apiUrl}/notifications/${notificationId}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      const current = this.notificationsSubject.value.map((notification) =>
        notification._id === updated._id ? updated : notification
      );

      this.notificationsSubject.next(current);
      this.unreadCountSubject.next(current.filter((notification) => !notification.isRead).length);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  }

  async clearAll(): Promise<void> {
    const token = await this.auth.getIdToken();
    if (!token) return;

    try {
      await firstValueFrom(
        this.http.delete<{ ok: boolean }>(`${environment.apiUrl}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);
    } catch (error) {
      console.error('Failed to clear notifications', error);
    }
  }

  appendRealtimeNotification(notification: NotificationItem): void {
    const current = [notification, ...this.notificationsSubject.value.filter((item) => item._id !== notification._id)];
    this.notificationsSubject.next(current);
    this.unreadCountSubject.next(current.filter((item) => !item.isRead).length);
  }
}
