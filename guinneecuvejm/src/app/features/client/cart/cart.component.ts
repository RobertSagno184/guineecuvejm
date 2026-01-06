import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { CloudinaryImageComponent } from '../../../shared/components/cloudinary-image/cloudinary-image.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PricePipe,
    CloudinaryImageComponent
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly cart = this.cartService.cart;
  readonly isLoading = signal(false);
  readonly isUpdating = signal<string | null>(null);

  readonly isEmpty = computed(() => this.cart().items.length === 0);

  ngOnInit(): void {
    // Le panier est déjà chargé par le service
  }

  async updateQuantity(item: CartItem, newQuantity: number): Promise<void> {
    if (newQuantity < 1) {
      await this.removeItem(item);
      return;
    }

    if (newQuantity > item.product.stock) {
      alert(`Stock disponible : ${item.product.stock} unité(s)`);
      return;
    }

    this.isUpdating.set(item.productId);
    try {
      await this.cartService.updateQuantity(item.productId, newQuantity);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      alert(error.message || 'Erreur lors de la mise à jour de la quantité');
    } finally {
      this.isUpdating.set(null);
    }
  }

  async removeItem(item: CartItem): Promise<void> {
    if (confirm(`Êtes-vous sûr de vouloir retirer "${item.product.name}" du panier ?`)) {
      this.isUpdating.set(item.productId);
      try {
        await this.cartService.removeItem(item.productId);
      } catch (error: any) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de l\'article');
      } finally {
        this.isUpdating.set(null);
      }
    }
  }

  async clearCart(): Promise<void> {
    if (confirm('Êtes-vous sûr de vouloir vider complètement votre panier ?')) {
      this.isLoading.set(true);
      try {
        await this.cartService.clearCart();
      } catch (error: any) {
        console.error('Erreur lors du vidage:', error);
        alert('Erreur lors du vidage du panier');
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  proceedToCheckout(): void {
    if (this.isEmpty()) {
      alert('Votre panier est vide');
      return;
    }
    this.router.navigate(['/client/commande']);
  }

  continueShopping(): void {
    this.router.navigate(['/client/catalogue']);
  }

  getStockStatus(item: CartItem): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (item.product.stock === 0) return 'out-of-stock';
    if (item.product.stock <= item.product.minStock) return 'low-stock';
    return 'in-stock';
  }

  getStockMessage(item: CartItem): string {
    const stock = item.product.stock;
    if (stock === 0) return 'Rupture de stock';
    if (stock <= item.product.minStock) return `Stock faible (${stock} disponible${stock > 1 ? 's' : ''})`;
    return `${stock} disponible${stock > 1 ? 's' : ''}`;
  }
}
