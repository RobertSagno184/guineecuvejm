import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService } from '../../../../core/services/firebase/orders.service';
import { ProductsService } from '../../../../core/services/firebase/products.service';
import { CustomersService } from '../../../../core/services/firebase/customers.service';
import { OrderItem, OrderStatus } from '../../../../shared/models/order.model';
import { Product } from '../../../../shared/models/product.model';
import { Customer } from '../../../../shared/models/customer.model';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PricePipe],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
})
export class OrderFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly customersService = inject(CustomersService);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly products = signal<Product[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly customer = signal<Customer | null>(null);
  readonly customerId = signal<string | null>(null);

  orderForm: FormGroup = this.fb.group({
    customerId: ['', [Validators.required]],
    items: this.fb.array([]),
    paymentMethod: ['cash', [Validators.required]],
    notes: ['']
  });

  ngOnInit(): void {
    const customerId = this.route.snapshot.queryParamMap.get('customerId');
    if (customerId) {
      this.customerId.set(customerId);
      this.orderForm.patchValue({ customerId });
      this.loadCustomer(customerId);
    } else {
      this.loadCustomers();
    }
    this.loadProducts();
  }

  private loadCustomer(id: string): void {
    this.customersService.getById(id).subscribe({
      next: (customer) => {
        if (customer) {
          this.customer.set(customer);
        }
      },
      error: (error) => console.error('Erreur lors du chargement du client:', error)
    });
  }

  private loadCustomers(): void {
    this.customersService.getAll().subscribe({
      next: (customers) => {
        this.customers.set(customers);
      },
      error: (error) => console.error('Erreur lors du chargement des clients:', error)
    });
  }

  private loadProducts(): void {
    this.isLoading.set(true);
    this.productsService.getAll().subscribe({
      next: (products) => {
        this.products.set(products.filter(p => p.isActive));
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.isLoading.set(false);
      }
    });
  }

  get itemsFormArray(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  addProductItem(): void {
    const itemGroup = this.fb.group({
      productId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]]
    });

    // Écouter les changements de produit pour mettre à jour le prix unitaire et la quantité max
    itemGroup.get('productId')?.valueChanges.subscribe(productId => {
      if (productId) {
        const product = this.products().find(p => p.id === productId);
        if (product) {
          itemGroup.patchValue({ unitPrice: product.price }, { emitEvent: false });
          // Limiter la quantité au stock disponible
          const currentQuantity = itemGroup.get('quantity')?.value || 1;
          const maxQuantity = product.stock;
          if (currentQuantity > maxQuantity) {
            itemGroup.patchValue({ quantity: maxQuantity }, { emitEvent: false });
          }
          // Mettre à jour le validateur de quantité max
          itemGroup.get('quantity')?.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(maxQuantity)
          ]);
          itemGroup.get('quantity')?.updateValueAndValidity({ emitEvent: false });
        }
      }
    });

    // Écouter les changements de quantité pour vérifier le stock
    itemGroup.get('quantity')?.valueChanges.subscribe(quantity => {
      const productId = itemGroup.get('productId')?.value;
      if (productId && quantity) {
        const product = this.products().find(p => p.id === productId);
        if (product && quantity > product.stock) {
          // Limiter à la quantité disponible
          itemGroup.patchValue({ quantity: product.stock }, { emitEvent: false });
        }
      }
    });

    // Écouter les changements de quantité ou prix pour recalculer
    itemGroup.valueChanges.subscribe(() => {
      this.updateTotals();
    });

    this.itemsFormArray.push(itemGroup);
  }

  removeProductItem(index: number): void {
    this.itemsFormArray.removeAt(index);
    this.updateTotals();
  }

  getProductName(productId: string): string {
    const product = this.products().find(p => p.id === productId);
    return product ? product.name : '';
  }

  getProductStock(productId: string): number {
    const product = this.products().find(p => p.id === productId);
    return product ? product.stock : 0;
  }

  getMaxQuantity(index: number): number {
    const item = this.itemsFormArray.at(index);
    const productId = item.get('productId')?.value;
    if (productId) {
      return this.getProductStock(productId);
    }
    return 0;
  }

  isStockAvailable(index: number): boolean {
    const item = this.itemsFormArray.at(index);
    const productId = item.get('productId')?.value;
    const quantity = item.get('quantity')?.value || 0;
    if (productId) {
      const stock = this.getProductStock(productId);
      return quantity <= stock;
    }
    return true;
  }

  getStockStatus(index: number): { available: number; requested: number; insufficient: boolean } {
    const item = this.itemsFormArray.at(index);
    const productId = item.get('productId')?.value;
    const quantity = item.get('quantity')?.value || 0;
    if (productId) {
      const stock = this.getProductStock(productId);
      return {
        available: stock,
        requested: quantity,
        insufficient: quantity > stock
      };
    }
    return { available: 0, requested: 0, insufficient: false };
  }

  getItemTotal(index: number): number {
    const item = this.itemsFormArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    return quantity * unitPrice;
  }

  getSubtotal(): number {
    return this.itemsFormArray.controls.reduce((sum, control) => {
      const quantity = control.get('quantity')?.value || 0;
      const unitPrice = control.get('unitPrice')?.value || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  }

  getTax(): number {
    return 0; // Pas de TVA pour l'instant
  }

  getTotal(): number {
    return this.getSubtotal() + this.getTax();
  }

  private updateTotals(): void {
    // Cette méthode est appelée automatiquement lors des changements
    // Les getters calculent les totaux à la volée
  }

  async onSubmit(): Promise<void> {
    if (this.orderForm.invalid || this.itemsFormArray.length === 0) {
      this.orderForm.markAllAsTouched();
      if (this.itemsFormArray.length === 0) {
        await Swal.fire({
          title: 'Erreur',
          text: 'Veuillez ajouter au moins un produit à la commande.',
          icon: 'error',
          confirmButtonColor: '#ff9800'
        });
      }
      return;
    }

    // Vérifier le stock pour tous les produits
    const stockIssues: string[] = [];
    this.itemsFormArray.controls.forEach((control, index) => {
      const productId = control.get('productId')?.value;
      const quantity = control.get('quantity')?.value || 0;
      if (productId) {
        const product = this.products().find(p => p.id === productId);
        if (product && quantity > product.stock) {
          stockIssues.push(`${product.name}: Stock disponible ${product.stock}, quantité demandée ${quantity}`);
        }
      }
    });

    if (stockIssues.length > 0) {
      await Swal.fire({
        title: 'Stock insuffisant',
        html: 'Les produits suivants ont un stock insuffisant:<br><br>' + stockIssues.join('<br>'),
        icon: 'warning',
        confirmButtonColor: '#ff9800'
      });
      return;
    }

    this.isSubmitting.set(true);

    try {
      const formValue = this.orderForm.value;
      
      // Vérifier le stock une dernière fois avant de créer la commande
      const stockIssues: string[] = [];
      const itemsToCreate: OrderItem[] = [];
      
      for (const item of formValue.items) {
        const product = this.products().find(p => p.id === item.productId);
        if (!product) {
          stockIssues.push(`Produit introuvable: ${item.productId}`);
          continue;
        }
        
        if (item.quantity > product.stock) {
          stockIssues.push(`${product.name}: Stock disponible ${product.stock}, quantité demandée ${item.quantity}`);
          continue;
        }
        
        itemsToCreate.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice
        });
      }

      if (stockIssues.length > 0) {
        await Swal.fire({
          title: 'Stock insuffisant',
          html: 'Les produits suivants ont un stock insuffisant:<br><br>' + stockIssues.join('<br>'),
          icon: 'warning',
          confirmButtonColor: '#ff9800'
        });
        this.isSubmitting.set(false);
        return;
      }

      if (itemsToCreate.length === 0) {
        await Swal.fire({
          title: 'Erreur',
          text: 'Aucun produit valide à ajouter à la commande.',
          icon: 'error',
          confirmButtonColor: '#ff9800'
        });
        this.isSubmitting.set(false);
        return;
      }

      const subtotal = this.getSubtotal();
      const tax = this.getTax();
      const total = this.getTotal();

      // Récupérer le nom du client
      const customer = this.customer();
      const customerName = customer ? customer.companyName : '';

      // Créer la commande
      const orderId = await this.ordersService.create({
        customerId: formValue.customerId,
        customerName,
        items: itemsToCreate,
        subtotal,
        tax,
        total,
        status: 'pending' as OrderStatus,
        paymentMethod: formValue.paymentMethod,
        notes: formValue.notes || ''
      });

      await Swal.fire({
        title: 'Succès !',
        text: 'La commande a été créée avec succès.',
        icon: 'success',
        confirmButtonColor: '#ff9800'
      });

      // Rediriger vers la page de détail de la commande
      this.router.navigate(['/admin/orders', orderId]);
    } catch (error: any) {
      console.error('Erreur lors de la création de la commande:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue lors de la création de la commande.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    const customerId = this.customerId();
    if (customerId) {
      this.router.navigate(['/admin/customers', customerId]);
    } else {
      this.router.navigate(['/admin/orders']);
    }
  }

  getCustomerName(): string {
    const customer = this.customer();
    return customer ? customer.companyName : '';
  }
}

