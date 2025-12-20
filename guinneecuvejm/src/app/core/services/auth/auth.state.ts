import { Injectable, computed, signal } from '@angular/core';

export interface AuthUser {
  uid: string;
  email: string;
  role: 'admin' | 'client' | 'gérant' | 'guest';
}

@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly _user = signal<AuthUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? 'guest');

  setUser(user: AuthUser | null): void {
    this._user.set(user);
  }
}


