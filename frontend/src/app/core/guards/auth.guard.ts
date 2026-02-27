import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { map, take, switchMap, catchError } from 'rxjs/operators';
import { authState } from '@angular/fire/auth';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Protects routes — redirects to /login if not authenticated with Firebase.
 * The deactivated-account check is handled by the HTTP interceptor (403 response).
 */
export const authGuard: CanActivateFn = () => {
    const auth = inject(Auth);
    const router = inject(Router);
    return authState(auth).pipe(
        take(1),
        map(user => {
            if (user) return true;
            router.navigate(['/login']);
            return false;
        })
    );
};

/** Protects admin-only routes — redirects to / if not admin role */
export const adminRoleGuard: CanActivateFn = () => {
    const auth = inject(Auth);
    const router = inject(Router);
    const http = inject(HttpClient);

    return authState(auth).pipe(
        take(1),
        switchMap(user => {
            if (!user) {
                router.navigate(['/login']);
                return of(false);
            }

            // Fast path: role already in localStorage (set by NavbarComponent)
            const cached = localStorage.getItem('userRole');
            if (cached) {
                if (cached === 'admin') return of(true);
                router.navigate(['/']);
                return of(false);
            }

            // Slow path: first load or localStorage was cleared — fetch from API
            return http.get<{ role: string }>(`${environment.apiUrl}/users/me`).pipe(
                take(1),
                map(profile => {
                    localStorage.setItem('userRole', profile.role);
                    if (profile.role === 'admin') return true;
                    router.navigate(['/']);
                    return false;
                }),
                catchError(() => {
                    router.navigate(['/']);
                    return of(false);
                })
            );
        })
    );
};

/** @deprecated Use authGuard instead */
export const ssrSafeAuthGuard = authGuard;
