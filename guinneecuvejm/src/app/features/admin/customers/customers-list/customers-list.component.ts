import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CustomersService } from '../../../../core/services/firebase/customers.service';
import { OrdersService } from '../../../../core/services/firebase/orders.service';
import { Customer } from '../../../../shared/models/customer.model';
import { Order } from '../../../../shared/models/order.model';
import { FormsModule } from '@angular/forms';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { combineLatest } from 'rxjs';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PricePipe],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
})
export class CustomersListComponent implements OnInit {
  private readonly customersService = inject(CustomersService);
  private readonly ordersService = inject(OrdersService);
  readonly router = inject(Router);

  readonly customers = signal<Customer[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly searchTerm = signal('');
  readonly selectedType = signal<'all' | Customer['type']>('all');
  readonly sortBy = signal<'name' | 'orders' | 'spent' | 'date'>('name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal<number>(1);
  readonly itemsPerPage = signal<number>(25);
  readonly selectedCustomers = signal<Set<string>>(new Set());
  readonly selectAll = signal<boolean>(false);

  // Enrichir les clients avec les statistiques calculées dynamiquement depuis les commandes
  readonly customersWithStats = computed(() => {
    const customers = this.customers();
    const orders = this.orders();
    
    // Calculer les statistiques pour chaque client
    return customers.map(customer => {
      const customerOrders = orders.filter(order => order.customerId === customer.id);
      const totalOrders = customerOrders.length;
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
      
      return {
        ...customer,
        totalOrders,
        totalSpent
      };
    });
  });

  readonly filteredCustomers = computed(() => {
    let filtered = [...this.customersWithStats()];

    // Filtre par recherche
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(customer =>
        customer.companyName.toLowerCase().includes(search) ||
        customer.contactPerson.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        customer.phone.includes(search)
      );
    }

    // Filtre par type
    if (this.selectedType() !== 'all') {
      filtered = filtered.filter(customer => customer.type === this.selectedType());
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy()) {
        case 'name':
          comparison = a.companyName.localeCompare(b.companyName);
          break;
        case 'orders':
          comparison = a.totalOrders - b.totalOrders;
          break;
        case 'spent':
          comparison = a.totalSpent - b.totalSpent;
          break;
        case 'date':
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          comparison = dateA - dateB;
          break;
      }

      return this.sortOrder() === 'asc' ? comparison : -comparison;
    });

    return filtered;
  });

  readonly paginatedCustomers = computed(() => {
    const all = this.filteredCustomers();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return all.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredCustomers().length / this.itemsPerPage());
  });

  readonly totalResults = computed(() => {
    return this.filteredCustomers().length;
  });

  readonly stats = computed(() => {
    const all = this.customersWithStats();
    return {
      total: all.length,
      particuliers: all.filter(c => c.type === 'particulier').length,
      professionnels: all.filter(c => c.type === 'professionnel').length,
      revendeurs: all.filter(c => c.type === 'revendeur').length,
      totalOrders: all.reduce((sum, c) => sum + c.totalOrders, 0),
      totalSpent: all.reduce((sum, c) => sum + c.totalSpent, 0)
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    
    // Charger les clients et les commandes en parallèle
    combineLatest({
      customers: this.customersService.getAll(),
      orders: this.ordersService.getAll()
    }).subscribe({
      next: ({ customers, orders }) => {
        this.customers.set(customers);
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  onTypeFilterChange(type: 'all' | Customer['type']): void {
    this.selectedType.set(type);
  }

  onSortChange(sortBy: 'name' | 'orders' | 'spent' | 'date'): void {
    if (this.sortBy() === sortBy) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('asc');
    }
  }

  getTypeLabel(type: Customer['type']): string {
    const labels: Record<string, string> = {
      'particulier': 'Particulier',
      'professionnel': 'Professionnel',
      'revendeur': 'Revendeur'
    };
    return labels[type] || type;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF'
    }).format(amount);
  }

  viewCustomer(id: string): void {
    this.router.navigate(['/admin/customers', id]);
  }

  async deleteCustomer(id: string, companyName: string): Promise<void> {
    const result = await Swal.fire({
      title: 'Supprimer le client ?',
      html: `Voulez-vous vraiment supprimer <strong>${companyName}</strong> ?<br><small>Cette action est irréversible.</small>`,
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
      await this.customersService.delete(id);
      await Swal.fire({
        title: 'Supprimé !',
        text: 'Le client a été supprimé avec succès.',
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.loadData();
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

  toggleSelectAll(): void {
    if (this.selectAll()) {
      this.selectedCustomers.set(new Set());
      this.selectAll.set(false);
    } else {
      const allIds = new Set(this.paginatedCustomers().map(c => c.id));
      this.selectedCustomers.set(allIds);
      this.selectAll.set(true);
    }
  }

  toggleCustomerSelection(customerId: string): void {
    const selected = new Set(this.selectedCustomers());
    if (selected.has(customerId)) {
      selected.delete(customerId);
    } else {
      selected.add(customerId);
    }
    this.selectedCustomers.set(selected);
    this.selectAll.set(selected.size === this.paginatedCustomers().length);
  }

  isCustomerSelected(customerId: string): boolean {
    return this.selectedCustomers().has(customerId);
  }

  async deleteSelectedCustomers(): Promise<void> {
    const selected = Array.from(this.selectedCustomers());
    if (selected.length === 0) {
      await Swal.fire({
        title: 'Aucune sélection',
        text: 'Veuillez sélectionner au moins un client à supprimer.',
        icon: 'warning',
        confirmButtonColor: '#ff9800'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Supprimer les clients ?',
      html: `Voulez-vous vraiment supprimer <strong>${selected.length}</strong> client(s) sélectionné(s) ?<br><small>Cette action est irréversible.</small>`,
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
      for (const id of selected) {
        await this.customersService.delete(id);
      }
      await Swal.fire({
        title: 'Supprimé !',
        text: `${selected.length} client(s) supprimé(s) avec succès.`,
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.selectedCustomers.set(new Set());
      this.selectAll.set(false);
      this.loadData();
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

  onPageChange(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
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

  sendEmail(email: string, name: string): void {
    window.location.href = `mailto:${email}?subject=Contact Guinée Cuve Plastique`;
  }

  callPhone(phone: string): void {
    window.location.href = `tel:${phone}`;
  }

  viewCustomerOrders(customerId: string): void {
    this.router.navigate(['/admin/orders'], { queryParams: { customer: customerId } });
  }
}
