import { Component, inject, signal, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AuthState } from '../../../core/services/auth/auth.state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);

  loginType: 'client' | 'admin' | 'gérant' = 'client';

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly showSuccessMessage = signal(false);
  readonly registeredEmail = signal<string | null>(null);

  constructor() {
    // Vérifier le paramètre de type dans l'URL
    this.route.queryParams.subscribe(params => {
      if (params['type'] === 'admin' || params['type'] === 'gérant') {
        this.loginType = params['type'];
      }
      
      // Afficher le message de succès si l'utilisateur vient de s'inscrire
      if (params['registered'] === 'true') {
        this.showSuccessMessage.set(true);
        this.registeredEmail.set(params['email'] || null);
        // Pré-remplir l'email si disponible
        if (params['email']) {
          this.form.patchValue({ email: params['email'] });
        }
      }
    });

    // Rediriger automatiquement si l'utilisateur est déjà connecté
    effect(() => {
      if (this.authState.isAuthenticated()) {
        this.authService.redirectByRole();
      }
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.value;

    try {
      await this.authService.login(email!, password!);
      // La redirection se fera automatiquement via onAuthStateChanged dans AuthService
      // Pas besoin de rediriger manuellement ici
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Une erreur est survenue lors de la connexion');
      this.isLoading.set(false);
    }
  }

}


