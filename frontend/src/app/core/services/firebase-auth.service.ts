import { Injectable, inject } from '@angular/core';
import {
    Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User
} from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
    private auth = inject(Auth);
    private http = inject(HttpClient);

    private _currentUser$ = new BehaviorSubject<User | null>(null);
    readonly currentUser$ = this._currentUser$.asObservable();

    constructor() {
        onAuthStateChanged(this.auth, (user) => {
            this._currentUser$.next(user);
        });
    }

    get currentUser(): User | null {
        return this._currentUser$.value;
    }

    /** Get Firebase ID token for HTTP requests */
    async getIdToken(): Promise<string | null> {
        const user = this.auth.currentUser;
        if (!user) return null;
        return user.getIdToken();
    }

    loginWithEmail(email: string, password: string): Observable<void> {
        return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
            switchMap(() => this.syncUserToBackend())
        );
    }

    loginWithGoogle(): Observable<void> {
        const provider = new GoogleAuthProvider();
        return from(signInWithPopup(this.auth, provider)).pipe(
            switchMap(() => this.syncUserToBackend())
        );
    }

    register(email: string, password: string, name: string): Observable<void> {
        return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
            switchMap(() => this.syncUserToBackend(name))
        );
    }

    logout(): Observable<void> {
        return from(signOut(this.auth));
    }

    isLoggedIn(): boolean {
        return !!this._currentUser$.value;
    }

    /** Syncs Firebase user to MongoDB backend after login */
    private syncUserToBackend(name?: string): Observable<void> {
        const user = this.auth.currentUser;
        if (!user) return from(Promise.resolve());
        return from(user.getIdToken()).pipe(
            switchMap(token =>
                this.http.post<void>(`${environment.apiUrl}/users/sync`, {
                    name: name || user.displayName || user.email?.split('@')[0],
                    picture: user.photoURL || ''
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            )
        );
    }
}
