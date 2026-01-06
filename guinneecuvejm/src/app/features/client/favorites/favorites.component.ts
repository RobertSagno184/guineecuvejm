import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../../core/services/favorites.service';
import { CartService } from '../../../core/services/cart.service';
import { Product } from '../../../shared/models/product.model';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ProductCardComponent
  ],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss'
})
export class FavoritesComponent implements OnInit {
  private readonly favoritesService = inject(FavoritesService);
  private readonly cartService = inject(CartService);

  readonly favoriteProducts = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly isEmpty = signal(false);

  ngOnInit(): void {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    this.isLoading.set(true);
    this.favoritesService.getFavoriteProducts().subscribe({
      next: (products) => {
        this.favoriteProducts.set(products);
        this.isEmpty.set(products.length === 0);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des favoris:', error);
        this.isLoading.set(false);
        this.isEmpty.set(true);
      }
    });
  }

  onAddToCart(product: Product): void {
    try {
      this.cartService.addItem(product, 1);
      alert(`${product.name} ajouté au panier`);
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'ajout au panier');
    }
  }

  onRemoveFromFavorites(product: Product): void {
    if (confirm(`Voulez-vous retirer ${product.name} de vos favoris ?`)) {
      this.favoritesService.removeFromFavorites(product.id).then(() => {
        // Recharger la liste
        this.loadFavorites();
      }).catch((error) => {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression des favoris');
      });
    }
  }

  onRequestQuote(product: Product): void {
    // TODO: Implémenter la demande de devis
    console.log('Demander un devis:', product);
    alert('Fonctionnalité de devis à venir');
  }

  hasLowStockProducts(): boolean {
    return this.favoriteProducts().some(p => p.stock <= p.minStock || p.stock === 0);
  }

  getLowStockProducts(): Product[] {
    return this.favoriteProducts().filter(p => p.stock <= p.minStock || p.stock === 0);
  }
}
