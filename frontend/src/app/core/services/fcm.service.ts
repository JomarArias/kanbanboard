import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { getMessaging, getToken, isSupported, Messaging, onMessage } from 'firebase/messaging';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  private readonly firebaseApp = inject(FirebaseApp);
  private messaging?: Messaging;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const supported = await isSupported().catch(() => false);
    if (!supported || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    await this.registerServiceWorker();

    try {
      this.messaging = getMessaging(this.firebaseApp);
    } catch (error) {
      console.error('Firebase Messaging is unavailable in this environment', error);
      return;
    }

    this.listenForegroundMessages();
    await this.requestPermissionAndLogToken();
  }

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
      return await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    } catch (error) {
      console.error('Failed to register firebase-messaging-sw.js', error);
      return null;
    }
  }

  private async requestPermissionAndLogToken(): Promise<void> {
    if (!this.messaging) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      const vapidKey = environment.firebase.vapidKey;
      if (!vapidKey) {
        console.warn('Missing firebase.vapidKey in environment. FCM token will not be requested.');
        return;
      }

      const serviceWorkerRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      const token = await getToken(this.messaging, {
        vapidKey,
        serviceWorkerRegistration
      });

      if (token) {
        console.log('FCM token:', token);
      } else {
        console.warn('FCM token not available');
      }
    } catch (error) {
      console.error('Failed to request FCM token', error);
    }
  }

  private listenForegroundMessages(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('FCM foreground message:', payload);
    });
  }
}
