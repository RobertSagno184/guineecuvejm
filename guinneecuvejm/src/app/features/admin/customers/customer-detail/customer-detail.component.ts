import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomersService } from '../../../../core/services/firebase/customers.service';
import { OrdersService } from '../../../../core/services/firebase/orders.service';
import { Customer, CustomerCommunication } from '../../../../shared/models/customer.model';
import { Order } from '../../../../shared/models/order.model';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import { AuthState } from '../../../../core/services/auth/auth.state';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, PricePipe],
  templateUrl: './customer-detail.component.html',
  styleUrl: './customer-detail.component.scss',
})
export class CustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly customersService = inject(CustomersService);
  private readonly ordersService = inject(OrdersService);

  readonly customer = signal<Customer | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly selectedStatus = signal<'all' | Order['status']>('all');
  readonly isSendingEmail = signal(false);
  private readonly authState = inject(AuthState);

  readonly filteredOrders = signal<Order[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCustomer(id);
      this.loadOrders(id);
    }
  }

  private loadCustomer(id: string): void {
    this.isLoading.set(true);
    this.customersService.getById(id).subscribe({
      next: (customer) => {
        if (customer) {
          this.customer.set(customer);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.isLoading.set(false);
      }
    });
  }

  private loadOrders(customerId: string): void {
    this.ordersService.getByCustomer(customerId).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.updateFilteredOrders();
      },
      error: (error) => console.error('Erreur:', error)
    });
  }


  onStatusFilterChange(status: 'all' | Order['status']): void {
    this.selectedStatus.set(status);
    this.updateFilteredOrders();
  }

  private updateFilteredOrders(): void {
    const orders = this.orders();
    const status = this.selectedStatus();
    
    if (status === 'all') {
      this.filteredOrders.set(orders);
    } else {
      this.filteredOrders.set(orders.filter(o => o.status === status));
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

  goBack(): void {
    this.router.navigate(['/admin/customers']);
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/admin/orders', orderId]);
  }

  createOrder(): void {
    const customer = this.customer();
    if (customer) {
      this.router.navigate(['/admin/orders/new'], {
        queryParams: { customerId: customer.id }
      });
    }
  }

  getAverageOrderValue(): number {
    const orders = this.orders();
    if (orders.length === 0) return 0;
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    return Math.round(total / orders.length);
  }

  generateCustomerPDF(): void {
    const customer = this.customer();
    if (!customer) {
      Swal.fire('Erreur', 'Impossible de générer le PDF sans les détails du client.', 'error');
      return;
    }

    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    // Logo (placeholder)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 152, 0); // Primary color
    doc.text('Guinée Cuve Plastique', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Votre partenaire de confiance', margin, yPos);
    yPos += 15;

    // Titre
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FICHE CLIENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Informations du client
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations générales', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Entreprise / Nom: ${customer.companyName}`, margin, yPos);
    yPos += 6;
    doc.text(`Personne de contact: ${customer.contactPerson}`, margin, yPos);
    yPos += 6;
    doc.text(`Email: ${customer.email}`, margin, yPos);
    yPos += 6;
    doc.text(`Téléphone: ${customer.phone}`, margin, yPos);
    yPos += 6;
    doc.text(`Type: ${this.getTypeLabel(customer.type)}`, margin, yPos);
    yPos += 10;

    // Adresse
    doc.setFont('helvetica', 'bold');
    doc.text('Adresse', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`${customer.address.street}`, margin, yPos);
    yPos += 6;
    doc.text(`${customer.address.city}, ${customer.address.country}`, margin, yPos);
    yPos += 15;

    // Statistiques
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiques', margin, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Total commandes: ${customer.totalOrders}`, margin, yPos);
    yPos += 6;
    doc.text(`Total dépensé: ${this.formatCurrency(customer.totalSpent)}`, margin, yPos);
    yPos += 6;
    const avgOrder = this.getAverageOrderValue();
    doc.text(`Panier moyen: ${this.formatCurrency(avgOrder)}`, margin, yPos);
    yPos += 15;

    // Date d'inscription
    if (customer.createdAt) {
      doc.setFont('helvetica', 'bold');
      doc.text('Date d\'inscription', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(this.formatDate(customer.createdAt), margin, yPos);
    }

    // Pied de page
    doc.setFontSize(8);
    doc.text('Document généré le ' + new Date().toLocaleDateString('fr-FR'), pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`fiche-client-${customer.companyName.replace(/\s+/g, '-')}.pdf`);
  }

  async sendEmailToCustomer(): Promise<void> {
    const customer = this.customer();
    if (!customer) return;

    const { value: formValues } = await Swal.fire({
      title: 'Envoyer un email',
      html: `
        <div style="text-align: left; margin-bottom: 1rem;">
          <strong>À:</strong> ${customer.email}<br>
          <strong>Client:</strong> ${customer.companyName}
        </div>
        <input id="swal-subject" class="swal2-input" placeholder="Objet *" style="margin-top: 10px;">
        <textarea id="swal-content" class="swal2-textarea" placeholder="Message *" style="margin-top: 10px; min-height: 150px;"></textarea>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Envoyer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      preConfirm: () => {
        const subject = (document.getElementById('swal-subject') as HTMLInputElement)?.value;
        const content = (document.getElementById('swal-content') as HTMLTextAreaElement)?.value;
        if (!subject || !content) {
          Swal.showValidationMessage('Veuillez remplir tous les champs');
          return false;
        }
        return { subject, content };
      }
    });

    if (!formValues) return;

    this.isSendingEmail.set(true);
    try {
      // Enregistrer dans l'historique des communications
      const user = this.authState.user();
      const communication: CustomerCommunication = {
        type: 'email',
        subject: formValues.subject,
        content: formValues.content,
        sentAt: new Date(),
        sentBy: user?.email || 'Système'
      };

      const currentHistory = customer.communicationHistory || [];
      const updatedHistory = [...currentHistory, communication];

      await this.customersService.update(customer.id, {
        communicationHistory: updatedHistory
      } as any);

      // Ouvrir le client email
      const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(formValues.subject)}&body=${encodeURIComponent(formValues.content)}`;
      window.location.href = mailtoLink;

      await Swal.fire({
        title: 'Email préparé !',
        text: 'L\'email a été préparé et l\'historique a été mis à jour.',
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });

      await this.loadCustomer(customer.id);
    } catch (error) {
      console.error('Erreur:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue lors de l\'envoi.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
    } finally {
      this.isSendingEmail.set(false);
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  getCommunicationHistory(): CustomerCommunication[] {
    const customer = this.customer();
    if (!customer || !customer.communicationHistory) return [];
    return customer.communicationHistory.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  getCommunicationTypeLabel(type: CustomerCommunication['type']): string {
    const labels: Record<string, string> = {
      'email': 'Email',
      'phone': 'Appel téléphonique',
      'note': 'Note interne'
    };
    return labels[type] || type;
  }
}
