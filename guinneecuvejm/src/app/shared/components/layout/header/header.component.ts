import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
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
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly user = this.authState.user;
  readonly role = this.authState.role;

  readonly isDropdownOpen = signal(false);
  readonly notificationCount = signal(0); // TODO: Connecter à un service de notifications

  getUserInitials(): string {
    const user = this.user();
    if (!user) return 'U';
    
    const email = user.email || '';
    const parts = email.split('@')[0].split('.');
    
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    
    return email.substring(0, 2).toUpperCase();
  }

  getUserDisplayName(): string {
    const user = this.user();
    if (!user) return 'Utilisateur';
    
    // Utiliser le rôle comme nom d'affichage
    const roleNames: Record<string, string> = {
      'admin': 'Administrateur',
      'gérant': 'Gérant',
      'client': 'Client',
      'guest': 'Invité'
    };
    
    return roleNames[user.role] || user.role;
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(open => !open);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  toggleNotifications(): void {
    // TODO: Implémenter l'ouverture du panneau de notifications
    console.log('Ouvrir les notifications');
  }

  goToProfile(): void {
    const role = this.role();
    if (role === 'client') {
      this.router.navigate(['/client']);
    } else if (role === 'admin' || role === 'gérant') {
      this.router.navigate(['/admin']);
    }
  }

  goToSettings(): void {
    const role = this.role();
    if (role === 'admin' || role === 'gérant') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/client']);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}


