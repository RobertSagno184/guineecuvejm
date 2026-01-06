import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { AuthState } from '../../../core/services/auth/auth.state';
import { Order } from '../../../shared/models/order.model';
import { PricePipe } from '../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PricePipe
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly selectedStatus = signal<'all' | Order['status']>('all');
  readonly searchTerm = signal('');

  readonly filteredOrders = computed(() => {
    let filtered = [...this.orders()];

    // Filtre par statut
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter(order => order.status === this.selectedStatus());
    }

    // Filtre par recherche (numéro de commande)
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  readonly statusOptions = [
    { value: 'all', label: 'Toutes les commandes' },
    { value: 'pending', label: 'En attente' },
    { value: 'confirmed', label: 'Confirmées' },
    { value: 'processing', label: 'En préparation' },
    { value: 'shipped', label: 'Expédiées' },
    { value: 'delivered', label: 'Livrées' },
    { value: 'cancelled', label: 'Annulées' }
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    const userId = this.authState.user()?.uid;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.isLoading.set(true);
    this.ordersService.getByCustomer(userId).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commandes:', error);
        this.isLoading.set(false);
        alert('Erreur lors du chargement de vos commandes');
      }
    });
  }

  onStatusChange(status: 'all' | Order['status']): void {
    this.selectedStatus.set(status);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  clearFilters(): void {
    this.selectedStatus.set('all');
    this.searchTerm.set('');
  }

  getStatusLabel(status: Order['status']): string {
    const labels: Record<Order['status'], string> = {
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
    const colors: Record<Order['status'], string> = {
      'pending': '#ff9800',
      'confirmed': '#2196f3',
      'processing': '#9c27b0',
      'shipped': '#00b894',
      'delivered': '#00b894',
      'cancelled': '#f44336'
    };
    return colors[status] || '#666';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'cash': 'À la livraison',
      'bank_transfer': 'Virement bancaire',
      'check': 'Chèque'
    };
    return labels[method] || method;
  }

  get hasActiveFilters(): boolean {
    return this.selectedStatus() !== 'all' || this.searchTerm().trim() !== '';
  }

  getItemCount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/client/commandes', orderId]);
  }
}
