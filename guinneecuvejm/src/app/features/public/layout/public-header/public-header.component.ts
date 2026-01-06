import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthState } from '../../../../core/services/auth/auth.state';
import { AuthService } from '../../../../core/services/auth/auth.service';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.scss'
})
export class PublicHeaderComponent {
  private readonly authState = inject(AuthState);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly user = this.authState.user;
  readonly role = this.authState.role;
  readonly isMobileMenuOpen = signal(false);
  readonly currentRoute = signal('');

  constructor() {
    // Détecter la route actuelle
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute.set(event.url);
        this.isMobileMenuOpen.set(false);
      });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/public']);
  }

  goToDashboard(): void {
    const role = this.role();
    if (role === 'client') {
      this.router.navigate(['/client']);
    } else if (role === 'admin' || role === 'gérant') {
      this.router.navigate(['/admin']);
    }
  }
}

