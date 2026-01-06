import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OrdersService } from '../../../../core/services/firebase/orders.service';
import { Order, OrderStatus } from '../../../../shared/models/order.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss',
})
export class OrdersListComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);

  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly selectedStatus = signal<'all' | OrderStatus>('all');
  readonly searchTerm = signal('');
  readonly selectedCustomer = signal<string>('all');
  readonly sortColumn = signal<'orderNumber' | 'customerName' | 'total' | 'status' | 'createdAt' | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly currentPage = signal<number>(1);
  readonly itemsPerPage = signal<number>(25);
  readonly selectedOrders = signal<Set<string>>(new Set());
  readonly selectAll = signal<boolean>(false);

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.isLoading.set(true);
    this.ordersService.getAll().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commandes:', error);
        this.isLoading.set(false);
      }
    });
  }

  // Computed pour les commandes filtrées et triées
  readonly filteredAndSortedOrders = computed(() => {
    let filtered = [...this.orders()];

    // Filtre par statut
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter(order => order.status === this.selectedStatus());
    }

    // Filtre par recherche
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(search) ||
        (order.customerName || '').toLowerCase().includes(search) ||
        order.id.toLowerCase().includes(search)
      );
    }

    // Filtre par client
    if (this.selectedCustomer() !== 'all') {
      filtered = filtered.filter(order => order.customerId === this.selectedCustomer());
    }

    // Tri
    const column = this.sortColumn();
    const direction = this.sortDirection();
    if (column) {
      filtered.sort((a, b) => {
        let aVal: any = a[column];
        let bVal: any = b[column];

        if (column === 'createdAt') {
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  });

  // Computed pour la pagination
  readonly paginatedOrders = computed(() => {
    const all = this.filteredAndSortedOrders();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return all.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredAndSortedOrders().length / this.itemsPerPage());
  });

  readonly totalResults = computed(() => {
    return this.filteredAndSortedOrders().length;
  });

  readonly uniqueCustomers = computed(() => {
    const customers = new Map<string, string>();
    this.orders().forEach(order => {
      if (order.customerId && order.customerName) {
        customers.set(order.customerId, order.customerName);
      }
    });
    return Array.from(customers.entries()).map(([id, name]) => ({ id, name }));
  });

  readonly pendingOrdersCount = computed(() => {
    return this.orders().filter(o => o.status === 'pending').length;
  });

  onStatusChange(status: 'all' | OrderStatus): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  onCustomerChange(customerId: string): void {
    this.selectedCustomer.set(customerId);
    this.currentPage.set(1);
  }

  onSort(column: 'orderNumber' | 'customerName' | 'total' | 'status' | 'createdAt'): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return 'fa-sort';
    return this.sortDirection() === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
  }

  toggleSelectAll(): void {
    if (this.selectAll()) {
      this.selectedOrders.set(new Set());
      this.selectAll.set(false);
    } else {
      const allIds = new Set(this.paginatedOrders().map(o => o.id));
      this.selectedOrders.set(allIds);
      this.selectAll.set(true);
    }
  }

  toggleOrderSelection(orderId: string): void {
    const selected = new Set(this.selectedOrders());
    if (selected.has(orderId)) {
      selected.delete(orderId);
    } else {
      selected.add(orderId);
    }
    this.selectedOrders.set(selected);
    this.selectAll.set(selected.size === this.paginatedOrders().length);
  }

  isOrderSelected(orderId: string): boolean {
    return this.selectedOrders().has(orderId);
  }

  clearFilters(): void {
    this.selectedStatus.set('all');
    this.searchTerm.set('');
    this.selectedCustomer.set('all');
    this.currentPage.set(1);
  }

  async updateStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
    const statusLabels: Partial<Record<OrderStatus, string>> = {
      'pending': 'En attente',
      'processing': 'En traitement',
      'shipped': 'Expédiée',
      'delivered': 'Livrée',
      'cancelled': 'Annulée'
    };

    // Si annulation, demander la raison
    let reason: string | undefined;
    if (newStatus === 'cancelled') {
      const { value: formValues } = await Swal.fire({
        title: 'Annuler la commande ?',
        html: `
          <p>Voulez-vous annuler cette commande ?</p>
          <input id="swal-reason" class="swal2-input" placeholder="Raison de l'annulation (optionnel)" style="margin-top: 10px;">
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Oui, annuler',
        cancelButtonText: 'Non',
        reverseButtons: true,
        preConfirm: () => {
          const reasonInput = document.getElementById('swal-reason') as HTMLInputElement;
          return reasonInput?.value || undefined;
        }
      });

      if (!formValues && formValues !== undefined) {
        this.loadOrders();
        return;
      }
      reason = formValues;
    } else {
      const result = await Swal.fire({
        title: 'Changer le statut ?',
        text: `Voulez-vous changer le statut de la commande à "${statusLabels[newStatus]}" ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Oui, changer',
        cancelButtonText: 'Annuler',
        reverseButtons: true
      });

      if (!result.isConfirmed) {
        this.loadOrders();
        return;
      }
    }

    try {
      await this.ordersService.updateStatus(orderId, newStatus, reason);
      await Swal.fire({
        title: 'Modifié !',
        text: 'Le statut de la commande a été mis à jour avec succès.',
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.loadOrders();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue lors de la mise à jour du statut.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
      this.loadOrders();
    }
  }

  async deleteSelectedOrders(): Promise<void> {
    const selected = Array.from(this.selectedOrders());
    if (selected.length === 0) {
      await Swal.fire({
        title: 'Aucune sélection',
        text: 'Veuillez sélectionner au moins une commande à supprimer.',
        icon: 'warning',
        confirmButtonColor: '#ff9800'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Supprimer les commandes ?',
      html: `Voulez-vous vraiment supprimer <strong>${selected.length}</strong> commande(s) sélectionnée(s) ?<br><small>Cette action est irréversible.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      // TODO: Implémenter la suppression en masse dans le service
      for (const id of selected) {
        await this.ordersService.delete(id);
      }
      await Swal.fire({
        title: 'Supprimé !',
        text: `${selected.length} commande(s) supprimée(s) avec succès.`,
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.selectedOrders.set(new Set());
      this.selectAll.set(false);
      this.loadOrders();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue lors de la suppression.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  getStatusLabel(status: OrderStatus): string {
    const labels: Partial<Record<OrderStatus, string>> = {
      'pending': 'En attente',
      'processing': 'En traitement',
      'shipped': 'Expédiée',
      'delivered': 'Livrée',
      'cancelled': 'Annulée'
    };
    return labels[status] || status;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(total);
      }
    }
    
    return pages;
  }
}

