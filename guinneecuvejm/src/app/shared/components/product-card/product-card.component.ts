import { Component, Input, Output, EventEmitter, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../models/product.model';
import { PricePipe } from '../../pipes/price.pipe';
import { CloudinaryImageComponent } from '../cloudinary-image/cloudinary-image.component';
import { FavoritesService } from '../../../core/services/favorites.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PricePipe,
    CloudinaryImageComponent
  ],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent implements OnInit {
  private readonly favoritesService = inject(FavoritesService);

  @Input({ required: true }) product!: Product;
  @Input() showAddToCart: boolean = true;
  @Input() showFavorite: boolean = true;
  @Input() showQuote: boolean = true;
  
  @Output() addToCart = new EventEmitter<Product>();
  @Output() addToFavorites = new EventEmitter<Product>();
  @Output() requestQuote = new EventEmitter<Product>();

  isFavorite: boolean = false;

  constructor() {
    // Écouter les changements du signal favorites
    effect(() => {
      // Accéder au signal pour déclencher l'effect
      this.favoritesService.favorites();
      if (this.product) {
        this.isFavorite = this.favoritesService.isFavorite(this.product.id);
      }
    });
  }

  ngOnInit(): void {
    if (this.product) {
      this.isFavorite = this.favoritesService.isFavorite(this.product.id);
    }
  }

  get isInStock(): boolean {
    return this.product.stock > 0;
  }

  get isLowStock(): boolean {
    return this.product.stock > 0 && this.product.stock <= this.product.minStock;
  }

  get stockStatus(): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (this.product.stock === 0) return 'out-of-stock';
    if (this.product.stock <= this.product.minStock) return 'low-stock';
    return 'in-stock';
  }

  onAddToCart(event: Event): void {
    event.stopPropagation();
    if (this.isInStock) {
      this.addToCart.emit(this.product);
    }
  }

  onAddToFavorites(event: Event): void {
    event.stopPropagation();
    // Mettre à jour l'état local immédiatement pour un feedback visuel instantané
    this.isFavorite = !this.isFavorite;
    this.addToFavorites.emit(this.product);
  }

  onRequestQuote(event: Event): void {
    event.stopPropagation();
    this.requestQuote.emit(this.product);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'cuve': 'Cuve',
      'accessoire': 'Accessoire',
      'pompe': 'Pompe'
    };
    return labels[category] || category;
  }
}

