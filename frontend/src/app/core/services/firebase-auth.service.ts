import { Injectable, inject } from '@angular/core';
import {
    Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User, updateProfile
} from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WorkspaceService } from './workspace.service';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
    private auth = inject(Auth);
    private http = inject(HttpClient);
    private workspaceService = inject(WorkspaceService);

    private _currentUser$ = new BehaviorSubject<User | null>(null);
    readonly currentUser$ = this._currentUser$.asObservable();

    constructor() {
        if (!environment.production) {
            const devToken = localStorage.getItem('DEV_TOKEN');
            if (devToken && devToken.startsWith('DEV_TOKEN_')) {
                const email = devToken.replace('DEV_TOKEN_', '');
                const fakeUser = this.createDevUser(email, email.split('@')[0]);
                this._currentUser$.next(fakeUser);
                return;
            }
        }

        onAuthStateChanged(this.auth, (user) => {
            if (!environment.production && localStorage.getItem('DEV_TOKEN')) return;
            this._currentUser$.next(user);
        });
    }

    get currentUser(): User | null {
        return this._currentUser$.value;
    }

    /** Helper to generate fake user for Dev */
    private createDevUser(email: string, name: string): User {
        return {
            uid: `dev_uid_${email}`,
            email: email,
            displayName: name,
            photoURL: '',
            getIdToken: async () => `DEV_TOKEN_${email}`
        } as unknown as User;
    }

    /** Get Firebase ID token for HTTP requests */
    async getIdToken(): Promise<string | null> {
        if (!environment.production) {
            const devToken = localStorage.getItem('DEV_TOKEN');
            if (devToken) return devToken;
        }

        const user = this.auth.currentUser;
        if (!user) return null;
        return user.getIdToken();
    }

    loginWithEmail(email: string, password: string): Observable<void> {
        if (!environment.production) {
            // Bypass Firebase in Dev Mode
            const fakeUser = this.createDevUser(email, email.split('@')[0]);
            localStorage.setItem('DEV_TOKEN', `DEV_TOKEN_${email}`);
            this._currentUser$.next(fakeUser);
            return this.syncUserToBackend(fakeUser.displayName || '');
        }

        return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
            switchMap(() => this.syncUserToBackend())
        );
    }

    loginWithGoogle(): Observable<void> {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        if (this.shouldUseRedirectForGoogleAuth()) {
            return from(signInWithRedirect(this.auth, provider)).pipe(
                map(() => void 0)
            );
        }

        return from(signInWithPopup(this.auth, provider)).pipe(
            tap((credential) => this._currentUser$.next(credential.user)),
            switchMap(() => this.syncUserToBackend())
        );
    }

    completeGoogleRedirect(): Observable<boolean> {
        return from(getRedirectResult(this.auth)).pipe(
            switchMap((result) => {
                if (!result?.user) return of(false);
                this._currentUser$.next(result.user);
                return this.syncUserToBackend().pipe(map(() => true));
            })
        );
    }

    register(email: string, password: string, name: string): Observable<void> {
        if (!environment.production) {
            // Bypass Firebase in Dev Mode
            const fakeUser = this.createDevUser(email, name);
            localStorage.setItem('DEV_TOKEN', `DEV_TOKEN_${email}`);
            this._currentUser$.next(fakeUser);
            return this.syncUserToBackend(name);
        }

        return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
            switchMap(() => {
                const user = this.auth.currentUser;
                if (user && name) {
                    // Guardar el nombre en Firebase Auth para que displayName esté disponible
                    return from(updateProfile(user, { displayName: name })).pipe(
                        tap(() => this._currentUser$.next({ ...this.auth.currentUser } as User)),
                        switchMap(() => this.syncUserToBackend(name))
                    );
                }
                return this.syncUserToBackend(name);
            })
        );
    }

    async updateUserProfile(displayName: string, photoURL: string): Promise<void> {
        const user = this.auth.currentUser;
        if (user) {
            await updateProfile(user, { displayName, photoURL });
            this._currentUser$.next({ ...this.auth.currentUser } as User); // Using spread trick avoids same-instance bypass just in case
        }
    }

    logout(): Observable<void> {
        if (!environment.production && localStorage.getItem('DEV_TOKEN')) {
            localStorage.removeItem('DEV_TOKEN');
            this._currentUser$.next(null);
            return from(Promise.resolve());
        }
        return from(signOut(this.auth));
    }

    isLoggedIn(): boolean {
        if (!environment.production && localStorage.getItem('DEV_TOKEN')) return true;
        return !!this._currentUser$.value;
    }

    /** Syncs Firebase user to MongoDB backend after login */
    private syncUserToBackend(name?: string): Observable<void> {
        const user = this._currentUser$.value || this.auth.currentUser;
        if (!user) return from(Promise.resolve());
        return from(user.getIdToken()).pipe(
            switchMap(token =>
                this.http.post<void>(`${environment.apiUrl}/users/sync`, {
                    name: name || user.displayName || user.email?.split('@')[0],
                    picture: user.photoURL || ''
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ),
            tap(() => {
                this.workspaceService.fetchMyWorkspaces().subscribe();
            })
        );
    }

    private shouldUseRedirectForGoogleAuth(): boolean {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

        const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
        const isSmallViewport = window.innerWidth < 768;
        const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

        return hasCoarsePointer || isSmallViewport || mobileUserAgent;
    }
}
