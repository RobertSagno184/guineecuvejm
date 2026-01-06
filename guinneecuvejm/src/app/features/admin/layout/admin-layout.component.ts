import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AuthState } from '../../../core/services/auth/auth.state';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzImageModule,
    ClickOutsideDirective
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  readonly isCollapsedSignal = signal(false);
  readonly user = this.authState.user;
  readonly role = this.authState.role;
  readonly isDropdownOpen = signal(false);
  readonly notificationCount = signal(0); // TODO: Connecter à un service de notifications
  activeMenu: string | null = null;
  pageTitle: string = 'Dashboard';

  // Propriété pour ng-zorro (two-way binding)
  get isCollapsed(): boolean {
    return this.isCollapsedSignal();
  }

  set isCollapsed(value: boolean) {
    this.isCollapsedSignal.set(value);
  }

  menuState = {
    parametre: false
  };

  ngOnInit(): void {
    // Détecter la route active au chargement
    this.updateActiveMenuFromRoute(this.router.url);

    // Écouter les changements de route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateActiveMenuFromRoute(event.url);
      });
  }

  private updateActiveMenuFromRoute(url: string): void {
    if (url.includes('/admin/products')) {
      this.setActiveMenu('produit');
    } else if (url.includes('/admin/orders')) {
      this.setActiveMenu('commande');
    } else if (url.includes('/admin/customers')) {
      this.setActiveMenu('client');
    } else if (url.includes('/admin/inventory')) {
      this.setActiveMenu('inventaire');
    } else if (url.includes('/admin/reports')) {
      this.setActiveMenu('rapport');
    } else if (url.includes('/admin/users')) {
      this.setActiveMenu('users');
    } else if (url === '/admin' || url === '/admin/') {
      this.setActiveMenu('dashboard');
    }
  }

  menuItems = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/admin',
      exact: true
    },
    {
      label: 'Produits',
      icon: 'skin',
      route: '/admin/products',
      exact: false
    },
    {
      label: 'Commandes',
      icon: 'shopping-cart',
      route: '/admin/orders',
      exact: false
    },
    {
      label: 'Clients',
      icon: 'team',
      route: '/admin/customers',
      exact: false
    },
    {
      label: 'Inventaire',
      icon: 'inbox',
      route: '/admin/inventory',
      exact: false
    },
    {
      label: 'Rapports',
      icon: 'file-text',
      route: '/admin/reports',
      exact: false
    }
  ];

  setActiveMenu(menu: string): void {
    this.activeMenu = menu;
    switch (menu) {
      case 'dashboard':
        this.pageTitle = 'Dashboard';
        break;
      case 'produit':
        this.pageTitle = 'Produits';
        break;
      case 'commande':
        this.pageTitle = 'Commandes';
        break;
      case 'client':
        this.pageTitle = 'Clients';
        break;
      case 'inventaire':
        this.pageTitle = 'Inventaire';
        break;
      case 'rapport':
        this.pageTitle = 'Rapports';
        break;
      case 'users':
        this.pageTitle = 'Utilisateurs';
        break;
      case 'parametre':
        this.pageTitle = 'Paramètres';
        break;
      default:
        this.pageTitle = 'Dashboard';
        break;
    }
  }

  confirmLogout(): void {
    const isConfirmed = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
    if (isConfirmed) {
      this.logout();
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

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
    this.router.navigate(['/admin']);
  }

  goToSettings(): void {
    this.setActiveMenu('parametre');
    // TODO: Naviguer vers la page de paramètres si elle existe
  }
}

