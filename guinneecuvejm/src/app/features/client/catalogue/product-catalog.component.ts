import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product } from '../../../shared/models/product.model';
import { ProductsService } from '../../../core/services/firebase/products.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { PricePipe } from '../../../shared/pipes/price.pipe';

type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest' | 'popularity';
type CategoryFilter = 'all' | 'cuve' | 'accessoire' | 'pompe';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductCardComponent,
    PricePipe
  ],
  templateUrl: './product-catalog.component.html',
  styleUrl: './product-catalog.component.scss'
})
export class ProductCatalogComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly favoritesService = inject(FavoritesService);

  readonly isLoading = signal(true);
  readonly products = signal<Product[]>([]);
  readonly searchTerm = signal('');
  readonly selectedCategory = signal<CategoryFilter>('all');
  readonly sortOption = signal<SortOption>('newest');
  readonly priceRange = signal({ min: 0, max: 0 });
  readonly selectedPriceRange = signal({ min: 0, max: 0 });

  readonly filteredProducts = computed(() => {
    let filtered = [...this.products()];

    // Filtre par catégorie
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }

    // Filtre par recherche
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
      );
    }

    // Filtre par prix
    const priceRange = this.selectedPriceRange();
    if (priceRange.max > 0) {
      filtered = filtered.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);
    }

    // Tri
    const sort = this.sortOption();
    filtered.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'popularity':
          // Pour l'instant, on utilise le stock comme indicateur de popularité
          return b.stock - a.stock;
        default:
          return 0;
      }
    });

    return filtered;
  });

  readonly categories = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'cuve', label: 'Cuves' },
    { value: 'accessoire', label: 'Accessoires' },
    { value: 'pompe', label: 'Pompes' }
  ];

  readonly sortOptions = [
    { value: 'newest', label: 'Nouveautés' },
    { value: 'price-asc', label: 'Prix croissant' },
    { value: 'price-desc', label: 'Prix décroissant' },
    { value: 'name-asc', label: 'Nom A-Z' },
    { value: 'name-desc', label: 'Nom Z-A' },
    { value: 'popularity', label: 'Popularité' }
  ];

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.isLoading.set(true);
    this.productsService.getActive().subscribe({
      next: (products) => {
        this.products.set(products);
        this.calculatePriceRange(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.isLoading.set(false);
      }
    });
  }

  private calculatePriceRange(products: Product[]): void {
    if (products.length === 0) {
      this.priceRange.set({ min: 0, max: 0 });
      this.selectedPriceRange.set({ min: 0, max: 0 });
      return;
    }

    const prices = products.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    this.priceRange.set({ min, max });
    this.selectedPriceRange.set({ min, max });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onCategoryChange(category: CategoryFilter): void {
    this.selectedCategory.set(category);
  }

  onSortChange(sort: SortOption): void {
    this.sortOption.set(sort);
  }

  onPriceRangeChange(): void {
    // Le binding two-way mettra à jour selectedPriceRange automatiquement
  }

  onAddToCart(product: Product): void {
    try {
      this.cartService.addItem(product, 1);
      // TODO: Afficher une notification de succès
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      alert(error.message || 'Erreur lors de l\'ajout au panier');
    }
  }

  async onAddToFavorites(product: Product): Promise<void> {
    try {
      if (this.favoritesService.isFavorite(product.id)) {
        await this.favoritesService.removeFromFavorites(product.id);
        alert(`${product.name} retiré des favoris`);
      } else {
        await this.favoritesService.addToFavorites(product.id);
        alert(`${product.name} ajouté aux favoris`);
      }
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la gestion des favoris');
    }
  }

  onRequestQuote(product: Product): void {
    // TODO: Implémenter la demande de devis
    console.log('Demander un devis:', product);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('all');
    this.sortOption.set('newest');
    this.selectedPriceRange.set(this.priceRange());
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm().trim() !== '' ||
      this.selectedCategory() !== 'all' ||
      this.selectedPriceRange().min !== this.priceRange().min ||
      this.selectedPriceRange().max !== this.priceRange().max
    );
  }
}

