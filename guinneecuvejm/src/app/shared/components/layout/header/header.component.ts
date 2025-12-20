import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthState } from '../../../../core/services/auth/auth.state';
import { AuthService } from '../../../../core/services/auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly authState = inject(AuthState);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly user = this.authState.user;
  readonly role = this.authState.role;

  logout(): void {
    this.authService.logout();
  }
}


