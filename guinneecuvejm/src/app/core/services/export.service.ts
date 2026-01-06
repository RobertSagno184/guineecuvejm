import { Injectable } from '@angular/core';
import { Product } from '../../shared/models/product.model';
import { Order } from '../../shared/models/order.model';
import { Customer } from '../../shared/models/customer.model';

@Injectable({ providedIn: 'root' })
export class ExportService {
  /**
   * Exporter des produits en CSV
   */
  exportProductsToCSV(products: Product[]): void {
    const headers = ['Nom', 'Description', 'Catégorie', 'Capacité (L)', 'Prix (GNF)', 'Stock', 'Stock Minimum', 'Statut'];
    const rows = products.map(p => [
      p.name,
      p.description,
      p.category,
      p.capacity.toString(),
      p.price.toString(),
      p.stock.toString(),
      p.minStock.toString(),
      p.isActive ? 'Actif' : 'Inactif'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    this.downloadFile(csvContent, 'produits.csv', 'text/csv');
  }

  /**
   * Exporter des commandes en CSV
   */
  exportOrdersToCSV(orders: Order[]): void {
    const headers = ['N° Commande', 'Client', 'Date', 'Montant Total', 'Statut', 'Méthode de paiement'];
    const rows = orders.map(o => [
      o.orderNumber,
      o.customerName || 'N/A',
      o.createdAt.toLocaleDateString('fr-FR'),
      o.total.toString(),
      o.status,
      o.paymentMethod
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    this.downloadFile(csvContent, 'commandes.csv', 'text/csv');
  }

  /**
   * Exporter des clients en CSV
   */
  exportCustomersToCSV(customers: Customer[]): void {
    const headers = ['Entreprise', 'Contact', 'Email', 'Téléphone', 'Type', 'Total Commandes', 'Total Dépensé'];
    const rows = customers.map(c => [
      c.companyName,
      c.contactPerson,
      c.email,
      c.phone,
      c.type,
      c.totalOrders.toString(),
      c.totalSpent.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    this.downloadFile(csvContent, 'clients.csv', 'text/csv');
  }

  /**
   * Générer un rapport texte simple
   */
  generateTextReport(data: {
    title: string;
    date: Date;
    stats?: any;
    content: string;
  }): string {
    return `
${'='.repeat(60)}
${data.title}
${'='.repeat(60)}
Date: ${data.date.toLocaleDateString('fr-FR')}
${'='.repeat(60)}

${data.content}

${data.stats ? `\nStatistiques:\n${JSON.stringify(data.stats, null, 2)}` : ''}
${'='.repeat(60)}
    `.trim();
  }

  /**
   * Télécharger un fichier
   */
  private downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Exporter un rapport en texte
   */
  exportTextReport(content: string, filename: string = 'rapport.txt'): void {
    this.downloadFile(content, filename, 'text/plain');
  }
}
