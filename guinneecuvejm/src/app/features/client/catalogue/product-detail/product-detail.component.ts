import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductsService } from '../../../../core/services/firebase/products.service';
import { CartService } from '../../../../core/services/cart.service';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { Product } from '../../../../shared/models/product.model';
import { CloudinaryImageComponent } from '../../../../shared/components/cloudinary-image/cloudinary-image.component';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { filter, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CloudinaryImageComponent,
    PricePipe
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly favoritesService = inject(FavoritesService);

  readonly product = signal<Product | null>(null);
  readonly isLoading = signal(true);
  readonly selectedImageIndex = signal(0);
  readonly quantity = signal(1);

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (id) {
          this.isLoading.set(true);
          return this.productsService.getById(id);
        }
        return of(null);
      })
    ).subscribe({
      next: (product) => {
        this.product.set(product);
        this.isLoading.set(false);
        if (!product) {
          this.router.navigate(['/client/catalogue']);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du produit:', error);
        this.isLoading.set(false);
        this.router.navigate(['/client/catalogue']);
      }
    });
  }

  selectImage(index: number): void {
    if (this.product() && index >= 0 && index < this.product()!.images.length) {
      this.selectedImageIndex.set(index);
    }
  }

  nextImage(): void {
    if (this.product() && this.product()!.images.length > 0) {
      const nextIndex = (this.selectedImageIndex() + 1) % this.product()!.images.length;
      this.selectedImageIndex.set(nextIndex);
    }
  }

  previousImage(): void {
    if (this.product() && this.product()!.images.length > 0) {
      const prevIndex = this.selectedImageIndex() === 0 
        ? this.product()!.images.length - 1 
        : this.selectedImageIndex() - 1;
      this.selectedImageIndex.set(prevIndex);
    }
  }

  increaseQuantity(): void {
    const currentQty = this.quantity();
    const maxQty = this.product()?.stock || 1;
    if (currentQty < maxQty) {
      this.quantity.set(currentQty + 1);
    }
  }

  decreaseQuantity(): void {
    const currentQty = this.quantity();
    if (currentQty > 1) {
      this.quantity.set(currentQty - 1);
    }
  }

  onQuantityChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    const maxQty = this.product()?.stock || 1;
    if (!isNaN(value) && value >= 1 && value <= maxQty) {
      this.quantity.set(value);
    } else {
      target.value = this.quantity().toString();
    }
  }

  async addToCart(): Promise<void> {
    const product = this.product();
    if (!product) return;

    try {
      this.cartService.addItem(product, this.quantity());
      alert(`${product.name} ajouté au panier (${this.quantity()} unité(s))`);
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'ajout au panier');
    }
  }

  async toggleFavorite(): Promise<void> {
    const product = this.product();
    if (!product) return;

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

  requestQuote(): void {
    // TODO: Implémenter la demande de devis
    alert('Fonctionnalité de devis à venir');
  }

  isFavorite(): boolean {
    return this.product() ? this.favoritesService.isFavorite(this.product()!.id) : false;
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'cuve': 'Cuve',
      'pompe': 'Pompe',
      'accessoire': 'Accessoire'
    };
    return labels[category] || category;
  }

  getStockStatus(): 'in-stock' | 'low-stock' | 'out-of-stock' {
    const product = this.product();
    if (!product) return 'out-of-stock';
    if (product.stock === 0) return 'out-of-stock';
    if (product.stock <= product.minStock) return 'low-stock';
    return 'in-stock';
  }
}
