import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthState } from '../../../core/services/auth/auth.state';
import { CustomersService } from '../../../core/services/firebase/customers.service';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { ProductsService } from '../../../core/services/firebase/products.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { CartService } from '../../../core/services/cart.service';
import { Customer } from '../../../shared/models/customer.model';
import { Order } from '../../../shared/models/order.model';
import { Product } from '../../../shared/models/product.model';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { firstValueFrom, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PricePipe,
    ProductCardComponent
  ],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit, OnDestroy {
  private readonly authState = inject(AuthState);
  private readonly customersService = inject(CustomersService);
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly cartService = inject(CartService);

  readonly customer = signal<Customer | null>(null);
  readonly recentOrders = signal<Order[]>([]);
  readonly recommendedProducts = signal<Product[]>([]);
  readonly favoriteProductsLowStock = signal<Product[]>([]);
  readonly isLoading = signal(true);
  
  readonly stats = signal({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0,
    processingOrders: 0
  });

  private subscriptions = new Subscription();

  constructor() {
    // Réagir aux changements de favoris pour mettre à jour les alertes de stock
    effect(() => {
      const favoriteIds = this.favoritesService.favorites();
      if (favoriteIds.length > 0) {
        this.loadFavoriteProductsLowStock(favoriteIds);
      } else {
        this.favoriteProductsLowStock.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
    this.setupDynamicUpdates();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setupDynamicUpdates(): void {
    const userId = this.authState.user()?.uid;
    if (!userId) return;

    // Mettre à jour les commandes en temps réel
    const ordersSubscription = this.ordersService.getByCustomer(userId).subscribe({
      next: (orders) => {
        const recentOrders = orders.slice(0, 5);
        this.recentOrders.set(recentOrders);

        // Recalculer les statistiques
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
        const processingOrders = orders.filter(o => o.status === 'processing' || o.status === 'shipped').length;
        
        const customer = this.customer();
        this.stats.set({
          totalOrders: customer?.totalOrders || orders.length,
          totalSpent: customer?.totalSpent || orders.reduce((sum, o) => sum + o.total, 0),
          pendingOrders,
          processingOrders
        });
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour des commandes:', error);
      }
    });

    // Mettre à jour les produits recommandés en temps réel
    const productsSubscription = this.productsService.getActive().subscribe({
      next: (products) => {
        const recommended = products
          .filter(p => p.isActive && p.stock > 0)
          .sort((a, b) => b.stock - a.stock)
          .slice(0, 6);
        this.recommendedProducts.set(recommended);
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour des produits:', error);
      }
    });

    // Mettre à jour les informations du client
    const customerSubscription = this.customersService.getById(userId).subscribe({
      next: (customer) => {
        if (customer) {
          this.customer.set(customer);
          // Recalculer les stats avec les nouvelles données client
          const orders = this.recentOrders();
          const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
          const processingOrders = orders.filter(o => o.status === 'processing' || o.status === 'shipped').length;
          
          this.stats.set({
            totalOrders: customer.totalOrders,
            totalSpent: customer.totalSpent,
            pendingOrders,
            processingOrders
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du client:', error);
      }
    });

    this.subscriptions.add(ordersSubscription);
    this.subscriptions.add(productsSubscription);
    this.subscriptions.add(customerSubscription);
  }

  private async loadDashboard(): Promise<void> {
    const userId = this.authState.user()?.uid;
    if (!userId) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    try {
      // Charger le client initial
      const customer = await firstValueFrom(this.customersService.getById(userId));
      if (customer) {
        this.customer.set(customer);
      }

      // Charger les commandes récentes initiales
      const orders = await firstValueFrom(this.ordersService.getByCustomer(userId));
      const recentOrders = orders.slice(0, 5);
      this.recentOrders.set(recentOrders);

      // Calculer les statistiques initiales
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
      const processingOrders = orders.filter(o => o.status === 'processing' || o.status === 'shipped').length;
      
      this.stats.set({
        totalOrders: customer?.totalOrders || orders.length,
        totalSpent: customer?.totalSpent || orders.reduce((sum, o) => sum + o.total, 0),
        pendingOrders,
        processingOrders
      });

      // Charger les produits recommandés initiaux
      const allProducts = await firstValueFrom(this.productsService.getActive());
      const recommended = allProducts
        .filter(p => p.isActive && p.stock > 0)
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 6);
      this.recommendedProducts.set(recommended);

      // Charger les produits favoris avec stock faible
      const favoriteIds = this.favoritesService.favorites();
      if (favoriteIds.length > 0) {
        await this.loadFavoriteProductsLowStock(favoriteIds);
      }

    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadFavoriteProductsLowStock(favoriteIds: string[]): Promise<void> {
    try {
      const favoriteProducts = await Promise.all(
        favoriteIds.map(id => firstValueFrom(this.productsService.getById(id)))
      );
      const lowStockFavorites = favoriteProducts
        .filter((p): p is Product => p !== null && (p.stock <= p.minStock || p.stock === 0))
        .slice(0, 5);
      this.favoriteProductsLowStock.set(lowStockFavorites);
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  }

  getStatusLabel(status: Order['status']): string {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'confirmed': 'Confirmée',
      'processing': 'En préparation',
      'shipped': 'Expédiée',
      'delivered': 'Livrée',
      'cancelled': 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusColor(status: Order['status']): string {
    const colors: Record<string, string> = {
      'pending': '#ff9800',
      'confirmed': '#2196f3',
      'processing': '#2196f3',
      'shipped': '#4caf50',
      'delivered': '#4caf50',
      'cancelled': '#f44336'
    };
    return colors[status] || '#999';
  }

  getCustomerName(): string {
    const customer = this.customer();
    if (!customer) return 'Client';
    return customer.contactPerson || customer.companyName || 'Client';
  }

  onAddToCart(product: Product): void {
    try {
      this.cartService.addItem(product, 1);
      alert(`${product.name} ajouté au panier`);
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'ajout au panier');
    }
  }

  onAddToFavorites(product: Product): void {
    // Géré par ProductCardComponent
  }

  onRequestQuote(product: Product): void {
    alert('Fonctionnalité de devis à venir');
  }
}
