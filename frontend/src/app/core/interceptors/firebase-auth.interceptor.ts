import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Injects Firebase ID token into requests to the API.
 * Also handles 403 "deactivated account" responses by signing out automatically.
 */
export const firebaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
    // Only attach token for our own API
    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    const auth = inject(Auth);
    const router = inject(Router);
    const user = auth.currentUser;

    const handle = (authReq: typeof req) =>
        next(authReq).pipe(
            catchError((err: HttpErrorResponse) => {
                // Backend returns 403 when isDeleted = true
                if (err.status === 403 &&
                    (err.error?.message?.toLowerCase().includes('deactivated') ||
                        err.error?.message?.toLowerCase().includes('not found or deactivated'))) {
                    // Force sign-out and redirect to login
                    localStorage.removeItem('userRole');
                    signOut(auth).finally(() => {
                        router.navigate(['/login'], {
                            queryParams: { reason: 'deactivated' }
                        });
                    });
                }
                return throwError(() => err);
            })
        );

    if (!user) {
        return handle(req);
    }

    return from(user.getIdToken()).pipe(
        switchMap(token => {
            const authReq = req.clone({
                setHeaders: { Authorization: `Bearer ${token}` }
            });
            return handle(authReq);
        })
    );
};
