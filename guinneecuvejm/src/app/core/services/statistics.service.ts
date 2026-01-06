import { Injectable, inject } from '@angular/core';
import { OrdersService } from './firebase/orders.service';
import { ProductsService } from './firebase/products.service';
import { CustomersService } from './firebase/customers.service';
import { Observable, combineLatest, map } from 'rxjs';
import { Order } from '../../shared/models/order.model';
import { Product } from '../../shared/models/product.model';

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
  pendingOrders: number;
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly customersService = inject(CustomersService);

  /**
   * Récupérer les statistiques du dashboard
   */
  getDashboardStats(): Observable<DashboardStats> {
    return combineLatest({
      todayOrders: this.ordersService.getTodayOrders(),
      allOrders: this.ordersService.getAll(),
      lowStock: this.productsService.getLowStock(),
      customers: this.customersService.getAll(),
      pendingOrders: this.ordersService.getByStatus('pending')
    }).pipe(
      map(({ todayOrders, allOrders, lowStock, customers, pendingOrders }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
        
        const monthlyOrders = allOrders.filter(order => 
          order.createdAt >= firstDayOfMonth
        );
        const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total, 0);

        return {
          todayOrders: todayOrders.length,
          todayRevenue,
          monthlyRevenue,
          totalCustomers: customers.length,
          lowStockProducts: lowStock.length,
          pendingOrders: pendingOrders.length
        };
      })
    );
  }

  /**
   * Récupérer les commandes des 30 derniers jours pour graphique
   */
  getOrdersLast30Days(): Observable<{ date: string; count: number; revenue: number }[]> {
    return this.ordersService.getAll().pipe(
      map(orders => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentOrders = orders.filter(order => order.createdAt >= thirtyDaysAgo);
        
        const groupedByDate = recentOrders.reduce((acc, order) => {
          const dateKey = order.createdAt.toISOString().split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = { count: 0, revenue: 0 };
          }
          acc[dateKey].count++;
          acc[dateKey].revenue += order.total;
          return acc;
        }, {} as Record<string, { count: number; revenue: number }>);

        return Object.entries(groupedByDate)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));
      })
    );
  }
}

