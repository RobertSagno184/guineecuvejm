import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdersService } from '../../../../core/services/firebase/orders.service';
import { CustomersService } from '../../../../core/services/firebase/customers.service';
import { Order } from '../../../../shared/models/order.model';
import { Customer } from '../../../../shared/models/customer.model';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly customersService = inject(CustomersService);

  readonly order = signal<Order | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(id);
    }
  }

  private async loadOrder(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const order = await firstValueFrom(this.ordersService.getById(id));
      if (order) {
        this.order.set(order);
        
        // Charger les informations du client
        if (order.customerId) {
          try {
            const customer = await firstValueFrom(this.customersService.getById(order.customerId));
            this.customer.set(customer);
          } catch (error) {
            console.error('Erreur lors du chargement du client:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      this.isLoading.set(false);
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  goBack(): void {
    this.router.navigate(['/admin/orders']);
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

  getPaymentMethodLabel(method: Order['paymentMethod']): string {
    const labels: Record<string, string> = {
      'cash': 'À la livraison',
      'bank_transfer': 'Virement bancaire',
      'check': 'Chèque'
    };
    return labels[method] || method;
  }

  getTypeLabel(type: Customer['type']): string {
    const labels: Record<string, string> = {
      'particulier': 'Particulier',
      'professionnel': 'Professionnel',
      'revendeur': 'Revendeur'
    };
    return labels[type] || type;
  }

  async updateStatus(newStatus: Order['status']): Promise<void> {
    const order = this.order();
    if (!order) return;

    const statusLabels: Partial<Record<Order['status'], string>> = {
      'pending': 'En attente',
      'processing': 'En traitement',
      'shipped': 'Expédiée',
      'delivered': 'Livrée',
      'cancelled': 'Annulée'
    };

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

      if (!formValues && formValues !== undefined) return;
      reason = formValues;
    } else {
      const result = await Swal.fire({
        title: 'Changer le statut ?',
        text: `Voulez-vous changer le statut à "${statusLabels[newStatus]}" ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Oui, changer',
        cancelButtonText: 'Annuler',
        reverseButtons: true
      });

      if (!result.isConfirmed) return;
    }

    try {
      await this.ordersService.updateStatus(order.id, newStatus, reason);
      await Swal.fire({
        title: 'Modifié !',
        text: 'Le statut a été mis à jour avec succès.',
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.loadOrder(order.id);
    } catch (error) {
      console.error('Erreur:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
    }
  }

  generateInvoicePDF(): void {
    const order = this.order();
    const customer = this.customer();
    if (!order || !customer) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // En-tête
    doc.setFontSize(20);
    doc.setTextColor(255, 152, 0);
    doc.text('FACTURE', pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`N° Facture: ${order.orderNumber}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Date: ${this.formatDate(order.createdAt)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 15;

    // Informations client
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Facturé à:', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(customer.companyName || customer.contactPerson, margin, yPos);
    yPos += 5;
    if (customer.contactPerson) {
      doc.text(customer.contactPerson, margin, yPos);
      yPos += 5;
    }
    doc.text(customer.email, margin, yPos);
    yPos += 5;
    doc.text(customer.phone, margin, yPos);
    yPos += 15;

    // Tableau des articles
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Articles', margin, yPos);
    yPos += 8;

    const tableTop = yPos;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Produit', margin, yPos);
    doc.text('Qté', margin + 100, yPos);
    doc.text('Prix unit.', margin + 120, yPos);
    doc.text('Total', pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    order.items.forEach(item => {
      doc.text(item.productName.substring(0, 30), margin, yPos);
      doc.text(item.quantity.toString(), margin + 100, yPos);
      doc.text(this.formatCurrency(item.unitPrice), margin + 120, yPos);
      doc.text(this.formatCurrency(item.totalPrice), pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    });

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Totaux
    doc.setFont('helvetica', 'bold');
    doc.text('Sous-total:', pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(this.formatCurrency(order.subtotal), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`TVA (18%):`, pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(this.formatCurrency(order.tax), pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    doc.setDrawColor(255, 152, 0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - margin - 50, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 152, 0);
    doc.text('TOTAL:', pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(this.formatCurrency(order.total), pageWidth - margin, yPos, { align: 'right' });
    yPos += 15;

    // Notes
    if (order.notes) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(order.notes, pageWidth - 2 * margin);
      doc.text(notesLines, margin, yPos);
    }

    // Pied de page
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Guinée Cuve Plastique JM - Merci pour votre confiance !', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Sauvegarder
    doc.save(`facture-${order.orderNumber}.pdf`);
  }

  generateOrderFormPDF(): void {
    const order = this.order();
    const customer = this.customer();
    if (!order || !customer) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(255, 152, 0);
    doc.text('BON DE COMMANDE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`N° Commande: ${order.orderNumber}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Date: ${this.formatDate(order.createdAt)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 15;

    // Informations client
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(customer.companyName || customer.contactPerson, margin, yPos);
    yPos += 5;
    doc.text(customer.email, margin, yPos);
    yPos += 5;
    doc.text(customer.phone, margin, yPos);
    yPos += 15;

    // Tableau des articles
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Articles commandés', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Produit', margin, yPos);
    doc.text('Qté', margin + 100, yPos);
    doc.text('Prix unit.', margin + 120, yPos);
    doc.text('Total', pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    order.items.forEach(item => {
      doc.text(item.productName.substring(0, 30), margin, yPos);
      doc.text(item.quantity.toString(), margin + 100, yPos);
      doc.text(this.formatCurrency(item.unitPrice), margin + 120, yPos);
      doc.text(this.formatCurrency(item.totalPrice), pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    });

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 152, 0);
    doc.text('TOTAL:', pageWidth - margin - 50, yPos, { align: 'right' });
    doc.text(this.formatCurrency(order.total), pageWidth - margin, yPos, { align: 'right' });
    yPos += 15;

    // Statut
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Statut:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(this.getStatusLabel(order.status), margin + 30, yPos);

    // Sauvegarder
    doc.save(`bon-commande-${order.orderNumber}.pdf`);
  }
}

