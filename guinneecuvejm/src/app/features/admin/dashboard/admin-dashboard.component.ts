import { Component, ElementRef, ViewChild, OnInit, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  Chart, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  LineController,
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { ProductsService } from '../../../core/services/firebase/products.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import { Order } from '../../../shared/models/order.model';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart', { static: false }) salesChart!: ElementRef<HTMLCanvasElement>;
  private salesChartInstance: Chart | null = null;
  
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly statisticsService = inject(StatisticsService);
  
  orders: Order[] = [];
  totalProducts: number = 0;
  pendingOrdersCount: number = 0;
  completedOrdersCount: number = 0;
  totalCompletedAmount: number = 0;
  allOrdersCount: number = 0;
  monthlyRevenue: number = 0;

  ngOnInit(): void {
    this.getTotalProduits();
    this.loadOrders();
    this.loadStatistics();
  }

  loadOrders(): void {
    this.ordersService.getAll().subscribe((orders: Order[]) => {
      this.orders = orders;

      // Mettre à jour les statistiques directement sans subscribe
      this.pendingOrdersCount = this.countPendingOrders(orders);
      this.allOrdersCount = this.countAllOrders(orders);
      this.completedOrdersCount = this.countCompletedOrders(orders);
      this.totalCompletedAmount = this.calculateTotalCompletedOrders(orders);
      
      // Mettre à jour le graphique avec les nouvelles données
      if (this.salesChartInstance) {
        this.updateChartWithRealData(orders);
      } else {
        // Si le graphique n'existe pas encore, le créer après un délai pour s'assurer que le canvas est rendu
        setTimeout(() => {
          if (!this.salesChartInstance && this.salesChart?.nativeElement) {
            this.createSalesChart();
          }
        }, 200);
      }
    });
  }

  loadStatistics(): void {
    this.statisticsService.getDashboardStats().subscribe({
      next: (stats) => {
        this.monthlyRevenue = stats.monthlyRevenue;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    });
  }

  ngAfterViewInit(): void {
    // Le graphique sera créé après le chargement des données dans loadOrders
    // Ne pas créer le graphique ici pour éviter les doublons
  } 

  getTotalProduits(): void {
    this.productsService.getAll().subscribe({
      next: (products) => {
        this.totalProducts = products.length; // Met à jour la variable avec le résultat
      },
      error: (error: any) => {
        console.error('Erreur lors de la récupération du total des produits:', error);
      },
    });
  }

  countPendingOrders(orders: Order[]): number {
    return orders.filter(order => order.status === 'pending').length;
  }

  countAllOrders(orders: Order[]): number {
    return orders.length;
  }

  countCompletedOrders(orders: Order[]): number {
    return orders.filter(order => order.status === 'delivered' || order.status === 'shipped').length;
  }

  calculateTotalCompletedOrders(orders: Order[]): number {
    return orders
      .filter(order => order.status === 'delivered' || order.status === 'shipped')
      .reduce((sum, order) => sum + order.total, 0);
  }

  createSalesChart(): void {
    if (!this.salesChart?.nativeElement) {
      console.warn('Canvas element not found');
      return;
    }

    // Détruire le graphique existant s'il y en a un AVANT de récupérer le contexte
    if (this.salesChartInstance) {
      try {
        this.salesChartInstance.destroy();
      } catch (error) {
        console.warn('Error destroying existing chart:', error);
      }
      this.salesChartInstance = null;
    }

    // Vérifier que le canvas n'est pas déjà utilisé par un autre graphique
    const canvas = this.salesChart.nativeElement;
    if ((canvas as any).chart) {
      try {
        ((canvas as any).chart as Chart).destroy();
      } catch (error) {
        console.warn('Error destroying canvas chart:', error);
      }
      (canvas as any).chart = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Could not get 2D context from canvas');
      return;
    }

    // Obtenir les données réelles des 7 derniers mois
    const chartData = this.getLast7MonthsData(this.orders);

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 152, 0, 0.8)'); // Utilisation de la couleur principale #ff9800
    gradient.addColorStop(1, 'rgba(255, 152, 0, 0.2)'); // Utilisation de la couleur principale #ff9800

    const data = {
      labels: chartData.labels,
      datasets: [{
        label: 'Ventes',
        data: chartData.values,
        fill: true,
        backgroundColor: gradient,
        borderColor: '#ff9800', // Couleur principale orange
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#ff9800', // Couleur principale orange
        pointHoverBackgroundColor: '#ff9800', // Couleur principale orange
        pointHoverBorderColor: '#ffffff',
        tension: 0.4
      }]
    };

    try {
      const chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1000
          },
        plugins: {
          title: {
            display: true,
            text: 'Performance des ventes',
            font: {
              size: 18,
              family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
              weight: 'bold'
            },
            color: '#333'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#ff9800', // Couleur principale orange
            borderWidth: 1,
            caretSize: 5,
            cornerRadius: 4
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Mois',
              color: '#333',
              font: {
                size: 14,
                family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
                weight: 'normal'
              }
            },
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Valeur des ventes (GNF)',
              color: '#333',
              font: {
                size: 14,
                family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
                weight: 'normal'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
            min: 1000000, // Commence à 1 000 000
            ticks: {
              color: '#666',
              stepSize: 5000000, // Pas de 5 000 000 (donne 1M, 6M, 11M, 16M...)
              maxTicksLimit: 10,
              callback: function(value: any) {
                // Formater les valeurs en millions avec format français
                if (value >= 1000000) {
                  const millions = value / 1000000;
                  // Afficher sans décimales si c'est un nombre entier
                  if (millions % 1 === 0) {
                    return millions.toFixed(0) + 'M';
                  }
                  return millions.toFixed(1) + 'M';
                }
                return new Intl.NumberFormat('fr-FR').format(value);
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'nearest'
        },
        elements: {
          line: {
            borderWidth: 2
          },
          point: {
            radius: 5,
            hoverRadius: 7
          }
        }
      }
    });
      
      // Stocker l'instance du graphique
      this.salesChartInstance = chart;
      (canvas as any).chart = chart;
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }

  getLast7MonthsData(orders: Order[]): { labels: string[]; values: number[] } {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const now = new Date();
    const labels: string[] = [];
    const values: number[] = [];

    // Créer un objet pour stocker les revenus par mois
    const monthlyRevenue: { [key: string]: number } = {};

    // Initialiser les 7 derniers mois
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyRevenue[monthKey] = 0;
      labels.push(months[date.getMonth()]);
    }

    // Calculer les revenus pour chaque mois
    orders.forEach(order => {
      if (order.status === 'delivered' || order.status === 'shipped') {
        const orderDate = order.createdAt;
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
        
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += order.total;
        }
      }
    });

    // Remplir les valeurs dans l'ordre
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      values.push(monthlyRevenue[monthKey] || 0);
    }

    return { labels, values };
  }

  updateChartWithRealData(orders: Order[]): void {
    if (!this.salesChartInstance) return;

    const chartData = this.getLast7MonthsData(orders);
    
    this.salesChartInstance.data.labels = chartData.labels;
    this.salesChartInstance.data.datasets[0].data = chartData.values;
    this.salesChartInstance.update();
  }
}


