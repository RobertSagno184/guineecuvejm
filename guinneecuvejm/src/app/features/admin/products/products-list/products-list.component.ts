import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductsService } from '../../../../core/services/firebase/products.service';
import { ExportService } from '../../../../core/services/export.service';
import { Product } from '../../../../shared/models/product.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly exportService = inject(ExportService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly filteredProducts = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly searchTerm = signal('');
  readonly selectedCategory = signal<'all' | Product['category']>('all');

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.isLoading.set(true);
    this.productsService.getAll().subscribe({
      next: (products) => {
        this.products.set(products);
        this.filteredProducts.set(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.applyFilters();
  }

  onCategoryChange(category: 'all' | Product['category']): void {
    this.selectedCategory.set(category);
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.products()];

    // Filtre par recherche
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
      );
    }

    // Filtre par catégorie
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(product => product.category === this.selectedCategory());
    }

    this.filteredProducts.set(filtered);
  }

  async deleteProduct(id: string, name: string): Promise<void> {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: `Voulez-vous vraiment supprimer le produit "${name}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await this.productsService.delete(id);
      await Swal.fire({
        title: 'Supprimé !',
        text: 'Le produit a été supprimé avec succès.',
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.loadProducts();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue lors de la suppression du produit.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
    }
  }

  async toggleActive(id: string, currentStatus: boolean): Promise<void> {
    try {
      await this.productsService.toggleActive(id, !currentStatus);
      await Swal.fire({
        title: 'Modifié !',
        text: `Le produit a été ${!currentStatus ? 'activé' : 'désactivé'} avec succès.`,
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.loadProducts();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue lors de la modification du produit.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
    }
  }

  getStockStatus(product: Product): 'ok' | 'low' | 'critical' {
    if (product.stock === 0) return 'critical';
    if (product.stock <= product.minStock) return 'low';
    return 'ok';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF'
    }).format(amount);
  }

  exportToCSV(): void {
    this.exportService.exportProductsToCSV(this.filteredProducts());
  }
}

