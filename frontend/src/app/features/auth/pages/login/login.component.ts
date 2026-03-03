import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FirebaseAuthService } from '../../../../core/services/firebase-auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
    mode: 'login' | 'register' = 'login';
    email = '';
    password = '';
    name = '';
    loading = false;
    errorMsg = '';
    showPassword = false;

    constructor(
        private authService: FirebaseAuthService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            if (params['reason'] === 'deactivated') {
                this.errorMsg = 'Tu cuenta ha sido desactivada. Contacta al administrador.';
            }
        });
    }

    onSubmit(): void {
        this.errorMsg = '';
        if (!this.email || !this.password) {
            this.errorMsg = 'Por favor completa todos los campos.';
            return;
        }
        if (this.password.length < 6) {
            this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        this.loading = true;
        const obs = this.mode === 'login'
            ? this.authService.loginWithEmail(this.email, this.password)
            : this.authService.register(this.email, this.password, this.name);

        obs.subscribe({
            next: () => { this.loading = false; this.router.navigate(['/']); },
            error: (err) => {
                this.loading = false;
                this.errorMsg = this.mapFirebaseError(err.code);
            }
        });
    }

    loginWithGoogle(): void {
        this.loading = true;
        this.authService.loginWithGoogle().subscribe({
            next: () => { this.loading = false; this.router.navigate(['/']); },
            error: (err) => { this.loading = false; this.errorMsg = this.mapFirebaseError(err.code); }
        });
    }

    private mapFirebaseError(code: string): string {
        const map: Record<string, string> = {
            'auth/user-not-found': 'Usuario no encontrado.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/email-already-in-use': 'El correo ya está registrado.',
            'auth/invalid-email': 'Correo electrónico inválido.',
            'auth/weak-password': 'La contraseña es muy débil.',
            'auth/popup-closed-by-user': 'Cerraste el popup de Google.',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
        };
        return map[code] || 'Ocurrió un error. Intenta de nuevo.';
    }
}
