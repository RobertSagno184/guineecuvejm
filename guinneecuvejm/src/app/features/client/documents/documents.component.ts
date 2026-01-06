import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthState } from '../../../core/services/auth/auth.state';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { Order } from '../../../shared/models/order.model';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { filter } from 'rxjs/operators';

interface Document {
  id: string;
  type: 'invoice' | 'quote';
  orderNumber?: string;
  title: string;
  date: Date;
  amount: number;
  status: string;
  downloadUrl?: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PricePipe
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  private readonly authState = inject(AuthState);
  private readonly ordersService = inject(OrdersService);

  readonly documents = signal<Document[]>([]);
  readonly pendingQuotes = signal<Document[]>([]);
  readonly isLoading = signal(true);
  readonly activeTab = signal<'invoices' | 'quotes'>('invoices');
  readonly filterStatus = signal<'all' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered'>('all');

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    const userId = this.authState.user()?.uid;
    if (!userId) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.ordersService.getByCustomer(userId).subscribe({
      next: (orders) => {
        // Convertir les commandes en documents (factures)
        const invoices: Document[] = orders
          .filter(order => order.status !== 'cancelled')
          .map(order => ({
            id: order.id,
            type: 'invoice' as const,
            orderNumber: order.orderNumber,
            title: `Facture ${order.orderNumber}`,
            date: order.createdAt,
            amount: order.total,
            status: order.status
          }));

        this.documents.set(invoices);
        this.pendingQuotes.set([]); // TODO: Charger les devis depuis une collection dédiée
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des documents:', error);
        this.isLoading.set(false);
      }
    });
  }

  setActiveTab(tab: 'invoices' | 'quotes'): void {
    this.activeTab.set(tab);
  }

  setFilterStatus(status: 'all' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered'): void {
    this.filterStatus.set(status);
  }

  getFilteredDocuments(): Document[] {
    const docs = this.activeTab() === 'invoices' ? this.documents() : this.pendingQuotes();
    const status = this.filterStatus();
    
    if (status === 'all') {
      return docs;
    }
    
    return docs.filter(doc => doc.status === status);
  }

  async downloadInvoice(document: Document): Promise<void> {
    try {
      // TODO: Implémenter la génération et le téléchargement du PDF
      // Pour l'instant, on affiche un message
      alert(`Téléchargement de la facture ${document.orderNumber}...\n\nLa génération PDF sera implémentée prochainement.`);
      
      // Exemple de code pour générer un PDF (à implémenter avec jsPDF ou pdfmake)
      // const pdf = await this.generateInvoicePDF(document);
      // pdf.save(`facture-${document.orderNumber}.pdf`);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement de la facture');
    }
  }

  getStatusLabel(status: string): string {
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

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'processing': 'status-processing',
      'shipped': 'status-shipped',
      'delivered': 'status-delivered',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || '';
  }
}
