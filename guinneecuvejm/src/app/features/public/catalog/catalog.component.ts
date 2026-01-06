import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductPublicService } from '../../../core/services/public/product-public.service';
import { SeoService } from '../../../core/services/public/seo.service';
import { PublicProduct } from '../../../shared/models/public-product.model';
import { PublicProductCardComponent } from '../../../shared/components/public/public-product-card/public-product-card.component';

@Component({
  selector: 'app-public-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicProductCardComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class CatalogComponent implements OnInit {
  private readonly productService = inject(ProductPublicService);
  private readonly seoService = inject(SeoService);

  allProducts = signal<PublicProduct[]>([]);
  filteredProducts = signal<PublicProduct[]>([]);
  isLoading = signal(true);

  // Filtres
  searchTerm = signal('');
  selectedCategory = signal<'all' | 'cuve' | 'pompe' | 'accessoire'>('all');
  capacityRange = signal<{ min: number; max: number }>({ min: 0, max: 10000 });
  viewMode = signal<'grid' | 'list'>('grid');

  // Options de filtres
  categories = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'cuve', label: 'Cuves' },
    { value: 'pompe', label: 'Pompes' },
    { value: 'accessoire', label: 'Accessoires' }
  ];

  capacityRanges = [
    { min: 0, max: 1000, label: '0 - 1000L' },
    { min: 1000, max: 2000, label: '1000 - 2000L' },
    { min: 2000, max: 5000, label: '2000 - 5000L' },
    { min: 5000, max: 10000, label: '5000L et plus' }
  ];

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Catalogue de Cuves Plastique - Guinée Cuve Plastique',
      description: 'Découvrez notre catalogue complet de cuves plastique, pompes et accessoires. Filtrez par catégorie, capacité et trouvez le produit adapté à vos besoins.',
      keywords: 'catalogue cuve plastique, cuve 1000L, cuve 2000L, cuve 5000L, pompe eau, accessoire cuve'
    });

    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.productService.getAll().subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.applyFilters();
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

  onCategoryChange(category: 'all' | 'cuve' | 'pompe' | 'accessoire'): void {
    this.selectedCategory.set(category);
    this.applyFilters();
  }

  onCapacityRangeChange(range: { min: number; max: number }): void {
    this.capacityRange.set(range);
    this.applyFilters();
  }

  toggleViewMode(): void {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('all');
    this.capacityRange.set({ min: 0, max: 10000 });
    this.applyFilters();
  }

  private applyFilters(): void {
    let products = [...this.allProducts()];

    // Filtre par recherche
    const search = this.searchTerm().toLowerCase();
    if (search) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.features.some(f => f.toLowerCase().includes(search))
      );
    }

    // Filtre par catégorie
    if (this.selectedCategory() !== 'all') {
      products = products.filter(p => p.category === this.selectedCategory());
    }

    // Filtre par capacité
    const range = this.capacityRange();
    products = products.filter(p =>
      p.capacity >= range.min && p.capacity <= range.max
    );

    this.filteredProducts.set(products);
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm() !== '' ||
      this.selectedCategory() !== 'all' ||
      this.capacityRange().min !== 0 ||
      this.capacityRange().max !== 10000
    );
  }
}
