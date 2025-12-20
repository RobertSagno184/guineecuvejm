import { Injectable, inject } from '@angular/core';
import { AuthState } from './auth.state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authState = inject(AuthState);

  login(email: string, password: string): void {
    // TODO: implémenter la vraie logique de login (Firebase ou API)
    console.warn('AuthService.login non implémenté, simulation de connexion.');
    // L'AuthState sera mis à jour par les composants après authentification réussie
  }

  logout(): void {
    this.authState.setUser(null);
  }
}


