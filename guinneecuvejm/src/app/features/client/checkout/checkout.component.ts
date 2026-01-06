import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { AuthState } from '../../../core/services/auth/auth.state';
import { CustomersService } from '../../../core/services/firebase/customers.service';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { CloudinaryImageComponent } from '../../../shared/components/cloudinary-image/cloudinary-image.component';
import { OrderItem } from '../../../shared/models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PricePipe,
    CloudinaryImageComponent
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly ordersService = inject(OrdersService);
  private readonly authState = inject(AuthState);
  private readonly customersService = inject(CustomersService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly cart = this.cartService.cart;
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);

  readonly deliveryForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
    street: ['', [Validators.required, Validators.minLength(5)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    country: ['Guinée', [Validators.required]],
    postalCode: ['']
  });

  readonly paymentForm = this.fb.group({
    paymentMethod: ['cash', [Validators.required]],
    notes: ['']
  });

  ngOnInit(): void {
    // Vérifier si le panier est vide
    if (this.cart().items.length === 0) {
      this.router.navigate(['/client/panier']);
      return;
    }

    // Pré-remplir le formulaire avec les infos utilisateur si disponibles
    this.loadUserInfo();
  }

  private async loadUserInfo(): Promise<void> {
    const userId = this.authState.user()?.uid;
    if (!userId) return;

    try {
      const customer = await firstValueFrom(this.customersService.getById(userId));
      if (customer) {
        this.deliveryForm.patchValue({
          fullName: customer.contactPerson,
          phone: customer.phone,
          street: customer.address.street,
          city: customer.address.city,
          country: customer.address.country || 'Guinée'
        });
      } else {
        // Essayer de récupérer depuis users collection
        const user = this.authState.user();
        if (user?.email) {
          this.deliveryForm.patchValue({
            fullName: user.email.split('@')[0] // Utiliser une partie de l'email comme nom par défaut
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos utilisateur:', error);
    }
  }

  async submitOrder(): Promise<void> {
    if (this.deliveryForm.invalid || this.paymentForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      this.paymentForm.markAllAsTouched();
      return;
    }

    const userId = this.authState.user()?.uid;
    if (!userId) {
      alert('Vous devez être connecté pour passer une commande');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.isSubmitting.set(true);

    try {
      // Convertir les items du panier en OrderItem
      const orderItems: OrderItem[] = this.cart().items.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }));

      // Créer la commande
      const orderId = await this.ordersService.create({
        customerId: userId,
        customerName: this.deliveryForm.value.fullName || '',
        items: orderItems,
        subtotal: this.cart().subtotal,
        tax: 0, // Pas de TVA
        total: this.cart().subtotal, // Total = sous-total (pas de TVA)
        status: 'pending',
        paymentMethod: this.paymentForm.value.paymentMethod as 'cash' | 'bank_transfer' | 'check',
        notes: this.paymentForm.value.notes || ''
      });

      // Vider le panier après création de la commande
      await this.cartService.clearCart();

      // Rediriger vers la page de confirmation/détail de commande
      this.router.navigate(['/client/commandes', orderId], {
        queryParams: { success: 'true' }
      });
    } catch (error: any) {
      console.error('Erreur lors de la création de la commande:', error);
      alert('Une erreur est survenue lors de la création de votre commande. Veuillez réessayer.');
      this.isSubmitting.set(false);
    }
  }

  goBackToCart(): void {
    this.router.navigate(['/client/panier']);
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'cash': 'À la livraison',
      'bank_transfer': 'Virement bancaire',
      'check': 'Chèque'
    };
    return labels[method] || method;
  }
}
