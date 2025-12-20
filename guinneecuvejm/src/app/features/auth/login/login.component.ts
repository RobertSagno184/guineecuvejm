import { Component, inject } from '@angular/core';
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

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // Vérifier le paramètre de type dans l'URL
    this.route.queryParams.subscribe(params => {
      if (params['type'] === 'admin' || params['type'] === 'gérant') {
        this.loginType = params['type'];
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.value;
    
    // TODO: Implémenter la vraie logique de login (Firebase ou API)
    // Pour l'instant, simulation basée sur le type de connexion
    console.log(`Connexion ${this.loginType}:`, { email });
    
    this.authService.login(email!, password!);
    
    // Définir le rôle selon le type de connexion
    const role = this.loginType === 'client' ? 'client' : 
                 this.loginType === 'admin' ? 'admin' : 'gérant';
    
    this.authState.setUser({
      uid: 'temp-' + Date.now(),
      email: email!,
      role: role
    });
    
    // Rediriger selon le rôle
    if (role === 'client') {
      this.router.navigate(['/client']);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  switchLoginType(type: 'client' | 'admin' | 'gérant'): void {
    this.loginType = type;
    this.router.navigate(['/auth/login'], { queryParams: { type } });
  }
}


