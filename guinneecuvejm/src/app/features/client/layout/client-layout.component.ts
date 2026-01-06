import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AuthState } from '../../../core/services/auth/auth.state';
import { CartService } from '../../../core/services/cart.service';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    FormsModule,
    ClickOutsideDirective
  ],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.scss'
})
export class ClientLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly user = this.authState.user;
  readonly isDropdownOpen = signal(false);
  readonly isMobileMenuOpen = signal(false);
  readonly cartItemCount = this.cartService.itemCount;
  readonly currentYear = new Date().getFullYear();
  readonly showScrollToTop = signal(false);
  newsletterEmail: string = '';
  pageTitle: string = 'Dashboard';

  constructor() {
    // Mettre à jour le titre de la page selon la route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageTitle();
      });
  }

  ngOnInit(): void {
    this.updatePageTitle();
    this.checkScrollPosition();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScrollPosition();
  }

  private checkScrollPosition(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollToTop.set(scrollPosition > 300);
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  subscribeNewsletter(event: Event): void {
    event.preventDefault();
    if (this.newsletterEmail) {
      // TODO: Implémenter l'inscription à la newsletter
      console.log('Inscription newsletter:', this.newsletterEmail);
      alert('Merci pour votre inscription à notre newsletter !');
      this.newsletterEmail = '';
    }
  }

  private updatePageTitle(): void {
    const url = this.router.url;
    const titles: Record<string, string> = {
      '/client': 'Dashboard',
      '/client/catalogue': 'Catalogue',
      '/client/panier': 'Panier',
      '/client/commande': 'Passer commande',
      '/client/commandes': 'Mes commandes',
      '/client/profil': 'Mon profil',
      '/client/favoris': 'Mes favoris',
      '/client/documents': 'Documents'
    };

    for (const [path, title] of Object.entries(titles)) {
      if (url.startsWith(path)) {
        this.pageTitle = title;
        break;
      }
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen.update(value => !value);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    const email = this.user()?.email || '';
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'CL';
  }

  getUserDisplayName(): string {
    return this.user()?.email || 'Client';
  }
}

