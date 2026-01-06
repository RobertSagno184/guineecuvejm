import { Component, inject, signal, computed, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  Chart, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  LineController,
  BarController,
  BarElement,
  ArcElement,
  PieController,
  DoughnutController,
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { StatisticsService } from '../../../core/services/statistics.service';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { ProductsService } from '../../../core/services/firebase/products.service';
import { CustomersService } from '../../../core/services/firebase/customers.service';
import { StockMovementsService } from '../../../core/services/firebase/stock-movements.service';
import { Order } from '../../../shared/models/order.model';
import { Product } from '../../../shared/models/product.model';
import { Customer } from '../../../shared/models/customer.model';
import { StockMovement } from '../../../shared/models/stock-movement.model';
import { combineLatest, map } from 'rxjs';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarController,
  BarElement,
  ArcElement,
  PieController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler
);

type ReportTab = 'overview' | 'sales' | 'products' | 'customers' | 'inventory' | 'financial';
type PeriodPreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  preset: PeriodPreset;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart', { static: false }) salesChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsChart', { static: false }) productsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('customersChart', { static: false }) customersChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockChart', { static: false }) stockChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart', { static: false }) categoryChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart', { static: false }) statusChart!: ElementRef<HTMLCanvasElement>;

  private readonly statisticsService = inject(StatisticsService);
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly customersService = inject(CustomersService);
  private readonly stockMovementsService = inject(StockMovementsService);

  // Data signals
  readonly orders = signal<Order[]>([]);
  readonly products = signal<Product[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly stockMovements = signal<StockMovement[]>([]);
  readonly isLoading = signal(true);

  // UI state
  readonly activeTab = signal<ReportTab>('overview');
  readonly periodPreset = signal<PeriodPreset>('month');
  readonly dateFrom = signal<string>('');
  readonly dateTo = signal<string>('');
  readonly comparePeriod = signal<boolean>(false);
  readonly compareDateFrom = signal<string>('');
  readonly compareDateTo = signal<string>('');

  // Chart instances
  private salesChartInstance: Chart | null = null;
  private productsChartInstance: Chart | null = null;
  private customersChartInstance: Chart | null = null;
  private stockChartInstance: Chart | null = null;
  private categoryChartInstance: Chart | null = null;
  private statusChartInstance: Chart | null = null;

  // Computed properties
  readonly currentPeriod = computed(() => {
    const preset = this.periodPreset();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let startDate: Date;
    let endDate = today;

    switch (preset) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default: // custom
        startDate = this.dateFrom() ? new Date(this.dateFrom()) : new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = this.dateTo() ? new Date(this.dateTo()) : today;
        break;
    }

    return { startDate, endDate };
  });

  readonly filteredOrders = computed(() => {
    const period = this.currentPeriod();
    return this.orders().filter(order => 
      order.createdAt >= period.startDate && order.createdAt <= period.endDate
    );
  });

  readonly salesStats = computed(() => {
    const orders = this.filteredOrders();
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    
    return {
      totalRevenue,
      orderCount,
      averageOrderValue,
      completedOrders: orders.filter(o => o.status === 'delivered').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length
    };
  });

  readonly topProducts = computed(() => {
    const orders = this.filteredOrders();
    const productSales: Record<string, { product: Product; quantity: number; revenue: number }> = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          const product = this.products().find(p => p.id === item.productId);
          if (product) {
            productSales[item.productId] = {
              product,
              quantity: 0,
              revenue: 0
            };
          }
        }
        if (productSales[item.productId]) {
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.totalPrice;
        }
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  });

  readonly topCustomers = computed(() => {
    const orders = this.filteredOrders();
    const customerStats: Record<string, { customer: Customer; orderCount: number; totalSpent: number }> = {};
    
    orders.forEach(order => {
      if (!customerStats[order.customerId]) {
        const customer = this.customers().find(c => c.id === order.customerId);
        if (customer) {
          customerStats[order.customerId] = {
            customer,
            orderCount: 0,
            totalSpent: 0
          };
        }
      }
      if (customerStats[order.customerId]) {
        customerStats[order.customerId].orderCount++;
        customerStats[order.customerId].totalSpent += order.total;
      }
    });

    return Object.values(customerStats)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  });

  readonly inventoryStats = computed(() => {
    const movements = this.stockMovements();
    const period = this.currentPeriod();
    const filteredMovements = movements.filter(m => 
      m.createdAt >= period.startDate && m.createdAt <= period.endDate
    );

    const receptions = filteredMovements.filter(m => m.type === 'reception');
    const adjustments = filteredMovements.filter(m => m.type === 'adjustment');
    const totalInventoryValue = this.products().reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockProducts = this.products().filter(p => p.stock <= p.minStock);

    return {
      receptions: receptions.length,
      adjustments: adjustments.length,
      totalInventoryValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: this.products().filter(p => p.stock === 0).length
    };
  });

  readonly growthRate = computed(() => {
    if (!this.comparePeriod()) return null;
    
    const current = this.salesStats();
    const comparePeriod = this.getComparePeriod();
    if (!comparePeriod) return null;

    const compareOrders = this.orders().filter(order => 
      order.createdAt >= comparePeriod.startDate && order.createdAt <= comparePeriod.endDate
    );
    const compareRevenue = compareOrders.reduce((sum, o) => sum + o.total, 0);
    
    if (compareRevenue === 0) return current.totalRevenue > 0 ? 100 : 0;
    
    return ((current.totalRevenue - compareRevenue) / compareRevenue) * 100;
  });

  ngOnInit(): void {
    this.initializeDates();
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  private initializeDates(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.dateFrom.set(firstDayOfMonth.toISOString().split('T')[0]);
    this.dateTo.set(today.toISOString().split('T')[0]);
  }

  private loadData(): void {
    this.isLoading.set(true);
    
    combineLatest({
      orders: this.ordersService.getAll(),
      products: this.productsService.getAll(),
      customers: this.customersService.getAll(),
      movements: this.stockMovementsService.getAll()
    }).subscribe({
      next: ({ orders, products, customers, movements }) => {
        this.orders.set(orders);
        this.products.set(products);
        this.customers.set(customers);
        this.stockMovements.set(movements);
        this.isLoading.set(false);
        
        // Créer les graphiques après le chargement
        setTimeout(() => {
          this.createCharts();
        }, 100);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        Swal.fire('Erreur', 'Impossible de charger les données', 'error');
        this.isLoading.set(false);
      }
    });
  }

  // Period management
  onPeriodPresetChange(preset: PeriodPreset): void {
    this.periodPreset.set(preset);
    if (preset === 'custom') {
      this.initializeDates();
    }
    setTimeout(() => this.createCharts(), 100);
  }

  onDateChange(): void {
    if (this.periodPreset() === 'custom') {
      setTimeout(() => this.createCharts(), 100);
    }
  }

  private getComparePeriod(): { startDate: Date; endDate: Date } | null {
    if (!this.comparePeriod() || !this.compareDateFrom() || !this.compareDateTo()) {
      return null;
    }

    const startDate = new Date(this.compareDateFrom());
    const endDate = new Date(this.compareDateTo());
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  // Charts
  private createCharts(): void {
    this.createSalesChart();
    this.createProductsChart();
    this.createCustomersChart();
    this.createStockChart();
    this.createCategoryChart();
    this.createStatusChart();
  }

  private createSalesChart(): void {
    if (!this.salesChart?.nativeElement) return;

    // Détruire le graphique existant
    if (this.salesChartInstance) {
      this.salesChartInstance.destroy();
    }

    const period = this.currentPeriod();
    const orders = this.filteredOrders();
    
    // Grouper par jour
    const dailyData: Record<string, { count: number; revenue: number }> = {};
    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { count: 0, revenue: 0 };
      }
      dailyData[dateKey].count++;
      dailyData[dateKey].revenue += order.total;
    });

    const labels = Object.keys(dailyData).sort();
    const revenues = labels.map(date => dailyData[date].revenue);
    const counts = labels.map(date => dailyData[date].count);

    const ctx = this.salesChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 152, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 152, 0, 0.2)');

    this.salesChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        datasets: [
          {
            label: 'Chiffre d\'affaires (GNF)',
            data: revenues,
            fill: true,
            backgroundColor: gradient,
            borderColor: '#ff9800',
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#ff9800',
            tension: 0.4
          },
          {
            label: 'Nombre de commandes',
            data: counts,
            fill: false,
            borderColor: '#1e88e5',
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#1e88e5',
            yAxisID: 'y1',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Évolution des ventes'
          }
        },
        scales: {
          y: {
            min: 0,
            position: 'left',
            title: {
              display: true,
              text: 'Chiffre d\'affaires (GNF)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            title: {
              display: true,
              text: 'Nombre de commandes'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    });
  }

  private createProductsChart(): void {
    if (!this.productsChart?.nativeElement) return;

    if (this.productsChartInstance) {
      this.productsChartInstance.destroy();
    }

    const topProducts = this.topProducts();
    const labels = topProducts.map(p => p.product.name);
    const revenues = topProducts.map(p => p.revenue);

    const ctx = this.productsChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.productsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Chiffre d\'affaires (GNF)',
          data: revenues,
          backgroundColor: 'rgba(255, 152, 0, 0.8)',
          borderColor: '#ff9800',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Top 10 produits les plus vendus'
          }
        },
        scales: {
          y: {
            min: 0
          }
        }
      }
    });
  }

  private createCustomersChart(): void {
    if (!this.customersChart?.nativeElement) return;

    if (this.customersChartInstance) {
      this.customersChartInstance.destroy();
    }

    const topCustomers = this.topCustomers();
    const labels = topCustomers.map(c => c.customer.companyName || c.customer.contactPerson);
    const revenues = topCustomers.map(c => c.totalSpent);

    const ctx = this.customersChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.customersChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Chiffre d\'affaires (GNF)',
          data: revenues,
          backgroundColor: 'rgba(30, 136, 229, 0.8)',
          borderColor: '#1e88e5',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Top 10 clients les plus actifs'
          }
        },
        scales: {
          y: {
            min: 0
          }
        }
      }
    });
  }

  private createStockChart(): void {
    if (!this.stockChart?.nativeElement) return;

    if (this.stockChartInstance) {
      this.stockChartInstance.destroy();
    }

    const period = this.currentPeriod();
    const movements = this.stockMovements().filter(m => 
      m.createdAt >= period.startDate && m.createdAt <= period.endDate
    );

    // Grouper par jour
    const dailyData: Record<string, { receptions: number; adjustments: number }> = {};
    movements.forEach(movement => {
      const dateKey = movement.createdAt.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { receptions: 0, adjustments: 0 };
      }
      if (movement.type === 'reception') {
        dailyData[dateKey].receptions++;
      } else if (movement.type === 'adjustment') {
        dailyData[dateKey].adjustments++;
      }
    });

    const labels = Object.keys(dailyData).sort();
    const receptions = labels.map(date => dailyData[date].receptions);
    const adjustments = labels.map(date => dailyData[date].adjustments);

    const ctx = this.stockChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.stockChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        datasets: [
          {
            label: 'Réceptions',
            data: receptions,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Ajustements',
            data: adjustments,
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Évolution des mouvements de stock'
          }
        },
        scales: {
          y: {
            min: 0
          }
        }
      }
    });
  }

  private createCategoryChart(): void {
    if (!this.categoryChart?.nativeElement) return;

    if (this.categoryChartInstance) {
      this.categoryChartInstance.destroy();
    }

    const orders = this.filteredOrders();
    const categoryRevenue: Record<string, number> = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const product = this.products().find(p => p.id === item.productId);
        if (product) {
          categoryRevenue[product.category] = (categoryRevenue[product.category] || 0) + item.totalPrice;
        }
      });
    });

    const labels = Object.keys(categoryRevenue);
    const data = Object.values(categoryRevenue);

    const ctx = this.categoryChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
        datasets: [{
          data,
          backgroundColor: [
            'rgba(255, 152, 0, 0.8)',
            'rgba(30, 136, 229, 0.8)',
            'rgba(76, 175, 80, 0.8)'
          ],
          borderColor: [
            '#ff9800',
            '#1e88e5',
            '#4caf50'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Revenus par catégorie'
          }
        }
      }
    });
  }

  private createStatusChart(): void {
    if (!this.statusChart?.nativeElement) return;

    if (this.statusChartInstance) {
      this.statusChartInstance.destroy();
    }

    const orders = this.filteredOrders();
    const statusCount: Record<string, number> = {};

    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });

    const labels = Object.keys(statusCount).map(s => {
      const labels: Record<string, string> = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'processing': 'En traitement',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée'
      };
      return labels[s] || s;
    });
    const data = Object.values(statusCount);

    const ctx = this.statusChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.statusChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            'rgba(255, 193, 7, 0.8)',
            'rgba(33, 150, 243, 0.8)',
            'rgba(156, 39, 176, 0.8)',
            'rgba(3, 169, 244, 0.8)',
            'rgba(76, 175, 80, 0.8)',
            'rgba(244, 67, 54, 0.8)'
          ],
          borderColor: [
            '#ffc107',
            '#2196f3',
            '#9c27b0',
            '#03a9f4',
            '#4caf50',
            '#f44336'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Répartition des commandes par statut'
          }
        }
      }
    });
  }

  // Tab management
  setActiveTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    setTimeout(() => {
      this.createCharts();
    }, 100);
  }

  // Formatting
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR');
  }

  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Exports
  async exportExcel(): Promise<void> {
    try {
      const period = this.currentPeriod();
      const orders = this.filteredOrders();
      const stats = this.salesStats();
      const topProducts = this.topProducts();
      const topCustomers = this.topCustomers();

      // Utiliser le point-virgule comme séparateur pour une meilleure compatibilité Excel
      const SEP = ';';
      // Utiliser le BOM UTF-8 pour Excel
      const BOM = '\uFEFF';
      let csvContent = BOM;
      
      // En-tête du rapport (ligne 1)
      csvContent += 'RAPPORT DE VENTES\n';
      
      // Informations de période (ligne 2) - Format: Libellé; Valeur
      csvContent += `Période${SEP}"${this.formatDate(period.startDate)} - ${this.formatDate(period.endDate)}"\n`;
      csvContent += `Date de génération${SEP}"${this.formatDate(new Date())}"\n`;
      csvContent += '\n';
      
      // Section RÉSUMÉ avec colonnes séparées (2 colonnes: Indicateur; Valeur)
      csvContent += 'RÉSUMÉ\n';
      csvContent += `Indicateur${SEP}Valeur\n`;
      csvContent += `"Chiffre d'affaires total (GNF)"${SEP}${stats.totalRevenue}\n`;
      csvContent += `"Nombre de commandes"${SEP}${stats.orderCount}\n`;
      csvContent += `"Panier moyen (GNF)"${SEP}${Math.round(stats.averageOrderValue)}\n`;
      csvContent += `"Commandes livrées"${SEP}${stats.completedOrders}\n`;
      csvContent += `"Commandes en attente"${SEP}${stats.pendingOrders}\n`;
      if (this.growthRate() !== null) {
        csvContent += `"Taux de croissance (%)"${SEP}${this.growthRate()!.toFixed(2)}\n`;
      }
      csvContent += '\n';

      // Section TOP 10 PRODUITS avec colonnes séparées
      csvContent += 'TOP 10 PRODUITS\n';
      csvContent += `Rang${SEP}Produit${SEP}"Quantité vendue"${SEP}"Chiffre d'affaires (GNF)"\n`;
      topProducts.forEach((p, index) => {
        const productName = p.product.name.replace(/"/g, '""');
        csvContent += `${index + 1}${SEP}"${productName}"${SEP}${p.quantity}${SEP}${p.revenue}\n`;
      });
      if (topProducts.length === 0) {
        csvContent += `1${SEP}"Aucun produit"${SEP}0${SEP}0\n`;
      }
      csvContent += '\n';

      // Section TOP 10 CLIENTS avec colonnes séparées
      csvContent += 'TOP 10 CLIENTS\n';
      csvContent += `Rang${SEP}Client${SEP}"Nombre de commandes"${SEP}"Total dépensé (GNF)"\n`;
      topCustomers.forEach((c, index) => {
        const clientName = (c.customer.companyName || c.customer.contactPerson).replace(/"/g, '""');
        csvContent += `${index + 1}${SEP}"${clientName}"${SEP}${c.orderCount}${SEP}${c.totalSpent}\n`;
      });
      if (topCustomers.length === 0) {
        csvContent += `1${SEP}"Aucun client"${SEP}0${SEP}0\n`;
      }
      csvContent += '\n';

      // Section DÉTAIL DES COMMANDES avec colonnes séparées
      csvContent += 'DÉTAIL DES COMMANDES\n';
      csvContent += `"N° Commande"${SEP}Client${SEP}Date${SEP}"Montant (GNF)"${SEP}Statut${SEP}"Méthode de paiement"\n`;
      orders.forEach(o => {
        const customerName = (o.customerName || 'N/A').replace(/"/g, '""');
        const statusLabels: Record<string, string> = {
          'pending': 'En attente',
          'confirmed': 'Confirmée',
          'processing': 'En traitement',
          'shipped': 'Expédiée',
          'delivered': 'Livrée',
          'cancelled': 'Annulée'
        };
        const statusLabel = statusLabels[o.status] || o.status;
        const paymentLabels: Record<string, string> = {
          'cash': 'Espèces',
          'bank_transfer': 'Virement',
          'check': 'Chèque'
        };
        const paymentLabel = paymentLabels[o.paymentMethod] || o.paymentMethod;
        // Format: colonnes séparées par des point-virgules
        csvContent += `"${o.orderNumber}"${SEP}"${customerName}"${SEP}"${this.formatDate(o.createdAt)}"${SEP}${o.total}${SEP}"${statusLabel}"${SEP}"${paymentLabel}"\n`;
      });
      if (orders.length === 0) {
        csvContent += `""${SEP}"Aucune commande"${SEP}""${SEP}0${SEP}""${SEP}""\n`;
      }

      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-ventes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      Swal.fire('Succès', 'Rapport exporté avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      Swal.fire('Erreur', 'Impossible d\'exporter le rapport', 'error');
    }
  }

  async exportPDF(): Promise<void> {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = margin;

      // En-tête
      doc.setFontSize(20);
      doc.setTextColor(255, 152, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT DE VENTES', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      const period = this.currentPeriod();
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`Période: ${this.formatDate(period.startDate)} - ${this.formatDate(period.endDate)}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Résumé
      const stats = this.salesStats();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSUMÉ', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Chiffre d'affaires total: ${this.formatCurrency(stats.totalRevenue)}`, margin, yPos);
      yPos += 6;
      doc.text(`Nombre de commandes: ${stats.orderCount}`, margin, yPos);
      yPos += 6;
      doc.text(`Panier moyen: ${this.formatCurrency(stats.averageOrderValue)}`, margin, yPos);
      yPos += 6;
      if (this.growthRate() !== null) {
        doc.text(`Taux de croissance: ${this.formatPercentage(this.growthRate()!)}`, margin, yPos);
        yPos += 6;
      }
      yPos += 10;

      // Top produits
      const topProducts = this.topProducts();
      if (topProducts.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP 10 PRODUITS', margin, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Produit', margin, yPos);
        doc.text('Qté', margin + 100, yPos);
        doc.text('CA', pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        topProducts.slice(0, 10).forEach(p => {
          if (yPos > 250) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(p.product.name.substring(0, 30), margin, yPos);
          doc.text(p.quantity.toString(), margin + 100, yPos);
          doc.text(this.formatCurrency(p.revenue), pageWidth - margin, yPos, { align: 'right' });
          yPos += 6;
        });
        yPos += 10;
      }

      // Top clients
      const topCustomers = this.topCustomers();
      if (topCustomers.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP 10 CLIENTS', margin, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Client', margin, yPos);
        doc.text('Commandes', margin + 100, yPos);
        doc.text('Total', pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        topCustomers.slice(0, 10).forEach(c => {
          if (yPos > 250) {
            doc.addPage();
            yPos = margin;
          }
          const name = (c.customer.companyName || c.customer.contactPerson).substring(0, 30);
          doc.text(name, margin, yPos);
          doc.text(c.orderCount.toString(), margin + 100, yPos);
          doc.text(this.formatCurrency(c.totalSpent), pageWidth - margin, yPos, { align: 'right' });
          yPos += 6;
        });
      }

      // Pied de page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} sur ${pageCount} - Généré le ${this.formatDate(new Date())}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`rapport-ventes-${new Date().toISOString().split('T')[0]}.pdf`);
      Swal.fire('Succès', 'Rapport PDF généré avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      Swal.fire('Erreur', 'Impossible de générer le rapport PDF', 'error');
    }
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
