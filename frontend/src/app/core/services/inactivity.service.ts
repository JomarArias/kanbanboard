import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthService } from './firebase-auth.service';
import { MessageService } from 'primeng/api';

@Injectable({
    providedIn: 'root'
})
export class InactivityService implements OnDestroy {
    private auth = inject(FirebaseAuthService);
    private router = inject(Router);
    private ngZone = inject(NgZone);
    private messageService = inject(MessageService);

    private timeoutId: any;
    // 15 minutos en milisegundos
    private readonly TIMEOUT_MS = 15 * 60 * 1000;
    private lastActivityTime: number = Date.now();

    private activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    private boundResetTimer = this.resetTimer.bind(this);

    constructor() {
        this.startTracking();
    }

    /**
     * Inicializa los event listeners de forma global
     */
    startTracking() {
        this.ngZone.runOutsideAngular(() => {
            this.activityEvents.forEach(evt => window.addEventListener(evt, this.boundResetTimer, true));
        });
        this.resetTimer();
    }

    /**
     * Reinicia el tiempo cuando hay actividad del usuario.
     */
    private resetTimer() {
        this.lastActivityTime = Date.now();

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            this.ngZone.run(() => this.logoutDueToInactivity());
        }, this.TIMEOUT_MS);
    }

    /**
     * Finaliza la sesión del usuario si se alcanza el límite de inactividad
     */
    private logoutDueToInactivity() {
        // Only logout if the user is currently logged in
        if (this.auth.isLoggedIn()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sesión expirada',
                detail: 'Tu sesión se ha cerrado por inactividad.',
                life: 5000
            });

            this.auth.logout().subscribe(() => {
                localStorage.removeItem('userRole'); // Clear any additional standard frontend caching
                this.router.navigate(['/login']);
            });
        }
    }

    /**
     * Limpia los event listeners cuando el servicio se destruye (opcional, suele vivir por el ciclo completo de la app)
     */
    ngOnDestroy(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.activityEvents.forEach(evt => window.removeEventListener(evt, this.boundResetTimer, true));
    }
}
