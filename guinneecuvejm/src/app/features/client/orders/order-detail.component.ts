import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { AuthState } from '../../../core/services/auth/auth.state';
import { Order } from '../../../shared/models/order.model';
import { PricePipe } from '../../../shared/pipes/price.pipe';

interface TimelineStep {
  status: Order['status'];
  label: string;
  description: string;
  icon: string;
  completed: boolean;
  current: boolean;
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    PricePipe
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly authState = inject(AuthState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly order = signal<Order | null>(null);
  readonly isLoading = signal(true);
  readonly isCancelling = signal(false);
  readonly showSuccessMessage = signal(false);
  readonly timelineSteps = signal<TimelineStep[]>([]);

  ngOnInit(): void {
    // Vérifier si on vient de créer la commande
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true') {
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 5000);
      }
    });

    // Charger la commande
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrder(orderId);
    } else {
      this.router.navigate(['/client/commandes']);
    }
  }

  private loadOrder(orderId: string): void {
    this.isLoading.set(true);
    this.ordersService.getById(orderId).subscribe({
      next: (order) => {
        if (!order) {
          this.router.navigate(['/client/commandes']);
          return;
        }

        // Vérifier que la commande appartient au client connecté
        const userId = this.authState.user()?.uid;
        if (order.customerId !== userId) {
          alert('Vous n\'avez pas accès à cette commande');
          this.router.navigate(['/client/commandes']);
          return;
        }

        this.order.set(order);
        this.buildTimeline(order);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la commande:', error);
        this.isLoading.set(false);
        alert('Erreur lors du chargement de la commande');
        this.router.navigate(['/client/commandes']);
      }
    });
  }

  private buildTimeline(order: Order): void {
    const allSteps: TimelineStep[] = [
      {
        status: 'pending',
        label: 'Commandé',
        description: 'Votre commande a été reçue',
        icon: 'shopping-cart',
        completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status),
        current: order.status === 'pending'
      },
      {
        status: 'confirmed',
        label: 'Confirmée',
        description: 'Votre commande a été confirmée',
        icon: 'check-circle',
        completed: ['processing', 'shipped', 'delivered'].includes(order.status),
        current: order.status === 'confirmed'
      },
      {
        status: 'processing',
        label: 'En préparation',
        description: 'Votre commande est en cours de préparation',
        icon: 'package',
        completed: ['shipped', 'delivered'].includes(order.status),
        current: order.status === 'processing'
      },
      {
        status: 'shipped',
        label: 'Expédiée',
        description: 'Votre commande a été expédiée',
        icon: 'truck',
        completed: order.status === 'delivered',
        current: order.status === 'shipped'
      },
      {
        status: 'delivered',
        label: 'Livrée',
        description: 'Votre commande a été livrée',
        icon: 'check',
        completed: order.status === 'delivered',
        current: order.status === 'delivered'
      }
    ];

    // Si annulée, on ne montre que le statut annulé
    if (order.status === 'cancelled') {
      this.timelineSteps.set([{
        status: 'cancelled',
        label: 'Annulée',
        description: 'Cette commande a été annulée',
        icon: 'x-circle',
        completed: true,
        current: true
      }]);
    } else {
      this.timelineSteps.set(allSteps);
    }
  }

  async cancelOrder(): Promise<void> {
    const order = this.order();
    if (!order) return;

    if (order.status !== 'pending') {
      alert('Seules les commandes en attente peuvent être annulées');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
      return;
    }

    this.isCancelling.set(true);
    try {
      await this.ordersService.updateStatus(order.id, 'cancelled');
      // Recharger la commande
      this.loadOrder(order.id);
      alert('Commande annulée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors de l\'annulation de la commande');
    } finally {
      this.isCancelling.set(false);
    }
  }

  downloadInvoice(): void {
    // TODO: Implémenter la génération et téléchargement du PDF
    alert('Fonctionnalité de téléchargement de facture à venir');
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

  canCancel(): boolean {
    const order = this.order();
    return order?.status === 'pending';
  }

  getEstimatedDeliveryDate(): Date {
    const order = this.order();
    if (!order) return new Date();
    
    // Estimation : 5-7 jours ouvrables après la commande
    const deliveryDate = new Date(order.createdAt);
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    return deliveryDate;
  }

  goBack(): void {
    this.router.navigate(['/client/commandes']);
  }
}
