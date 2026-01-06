import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ProductsService } from '../../../core/services/firebase/products.service';
import { StockMovementsService } from '../../../core/services/firebase/stock-movements.service';
import { FirebaseService } from '../../../core/services/firebase/firebase.service';
import { AuthState } from '../../../core/services/auth/auth.state';
import { Product } from '../../../shared/models/product.model';
import { StockMovement, StockMovementType, AdjustmentType } from '../../../shared/models/stock-movement.model';
import { collection, query, where, orderBy, limit, getDocs } from '@angular/fire/firestore';
import { from, firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly stockMovementsService = inject(StockMovementsService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly authState = inject(AuthState);
  private readonly fb = inject(FormBuilder);

  // Data signals
  readonly allProducts = signal<Product[]>([]);
  readonly allMovements = signal<StockMovement[]>([]);
  readonly isLoading = signal(true);

  // Filter and search signals
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<'all' | 'ok' | 'low' | 'critical'>('all');
  readonly categoryFilter = signal<'all' | Product['category']>('all');

  // Pagination signals
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(25);

  // UI state signals
  readonly showAdjustmentModal = signal(false);
  readonly showReceptionModal = signal(false);
  readonly showHistoryModal = signal(false);
  readonly selectedProduct = signal<Product | null>(null);
  readonly selectedProductMovements = signal<StockMovement[]>([]);

  // Forms
  adjustmentForm!: FormGroup;
  receptionForm!: FormGroup;

  // Computed properties
  readonly filteredProducts = computed(() => {
    let products = this.allProducts();

    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }

    // Status filter
    const status = this.statusFilter();
    if (status !== 'all') {
      products = products.filter(p => this.getStockStatus(p) === status);
    }

    // Category filter
    const category = this.categoryFilter();
    if (category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    return products;
  });

  readonly paginatedProducts = computed(() => {
    const products = this.filteredProducts();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return products.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.itemsPerPage());
  });

  readonly lowStockProducts = computed(() => {
    return this.allProducts().filter(p => p.stock <= p.minStock);
  });

  ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    // Adjustment form
    this.adjustmentForm = this.fb.group({
      adjustmentType: ['positive', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.01)]],
      reason: ['', [Validators.required, Validators.minLength(3)]],
      notes: ['']
    });

    // Reception form
    this.receptionForm = this.fb.group({
      receiptNumber: ['', Validators.required],
      supplier: [''],
      receiptDate: [new Date().toISOString().split('T')[0], Validators.required],
      items: this.fb.array<FormGroup>([])
    });
  }

  private loadData(): void {
    this.isLoading.set(true);
    
    // Load products
    this.productsService.getAll().subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        Swal.fire('Erreur', 'Impossible de charger les produits', 'error');
        this.isLoading.set(false);
      }
    });

    // Load movements
    this.stockMovementsService.getAll().subscribe({
      next: (movements) => {
        this.allMovements.set(movements);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des mouvements:', error);
      }
    });
  }

  getStockStatus(product: Product): 'ok' | 'low' | 'critical' {
    if (product.stock === 0) return 'critical';
    if (product.stock <= product.minStock) return 'low';
    return 'ok';
  }

  getStatusLabel(status: 'ok' | 'low' | 'critical'): string {
    const labels = {
      'ok': 'OK',
      'low': 'FAIBLE',
      'critical': 'CRITIQUE'
    };
    return labels[status];
  }

  // Search and filters
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(value: 'all' | 'ok' | 'low' | 'critical'): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  onCategoryFilterChange(value: 'all' | Product['category']): void {
    this.categoryFilter.set(value);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.categoryFilter.set('all');
    this.currentPage.set(1);
  }

  // Pagination
  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
  }

  // Stock adjustment
  openAdjustmentModal(product: Product): void {
    this.selectedProduct.set(product);
    this.adjustmentForm.reset({
      adjustmentType: 'positive',
      quantity: 0,
      reason: '',
      notes: ''
    });
    this.showAdjustmentModal.set(true);
  }

  closeAdjustmentModal(): void {
    this.showAdjustmentModal.set(false);
    this.selectedProduct.set(null);
    this.adjustmentForm.reset();
  }

  async submitAdjustment(): Promise<void> {
    if (this.adjustmentForm.invalid || !this.selectedProduct()) {
      return;
    }

    const product = this.selectedProduct()!;
    const formValue = this.adjustmentForm.value;
    const previousStock = product.stock;
    
    let quantityChange = formValue.quantity;
    if (formValue.adjustmentType === 'negative') {
      quantityChange = -quantityChange;
    }

    const newStock = Math.max(0, previousStock + quantityChange);

    if (newStock < 0) {
      Swal.fire('Erreur', 'Le stock ne peut pas être négatif', 'error');
      return;
    }

    try {
      // Update stock and ensure product is active
      await this.productsService.updateStock(product.id, newStock);
      
      // Activate product if it's not already active
      if (!product.isActive) {
        await this.productsService.toggleActive(product.id, true);
      }

      // Create movement record
      const user = this.authState.user();
      await this.stockMovementsService.create({
        productId: product.id,
        productName: product.name,
        type: 'adjustment',
        adjustmentType: formValue.adjustmentType as AdjustmentType,
        quantity: quantityChange,
        previousStock,
        newStock,
        reason: formValue.reason,
        notes: formValue.notes || undefined,
        createdBy: user?.uid || 'system',
        createdByName: user?.email || 'Système'
      });

      Swal.fire('Succès', 'Stock ajusté avec succès', 'success');
      this.closeAdjustmentModal();
      this.loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajustement:', error);
      Swal.fire('Erreur', 'Impossible d\'ajuster le stock', 'error');
    }
  }

  // Stock reception
  async openReceptionModal(): Promise<void> {
    const receiptNumber = await this.generateReceiptNumber();
    this.receptionForm.reset({
      receiptNumber,
      supplier: '',
      receiptDate: new Date().toISOString().split('T')[0],
      items: []
    });
    this.showReceptionModal.set(true);
  }

  /**
   * Générer un numéro de bon de réception unique (Format: BR-2024-001)
   * Note: Filtre côté client pour éviter les index composites Firestore
   */
  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const movementsRef = collection(this.firebaseService.firestore, 'stockMovements');
    const q = query(movementsRef, orderBy('createdAt', 'desc'));
    
    try {
      const snapshot = await firstValueFrom(from(getDocs(q)));
      
      // Filtrer côté client pour les réceptions de l'année en cours
      const receptions = snapshot.docs
        .map(doc => doc.data())
        .filter(data => data['type'] === 'reception' && data['receiptNumber'])
        .filter(data => {
          const receiptNumber = data['receiptNumber'] as string;
          return receiptNumber.startsWith(`BR-${year}-`);
        })
        .sort((a, b) => {
          const numA = parseInt((a['receiptNumber'] as string).split('-')[2] || '0');
          const numB = parseInt((b['receiptNumber'] as string).split('-')[2] || '0');
          return numB - numA;
        });
      
      if (receptions.length === 0) {
        return `BR-${year}-001`;
      }
      
      const lastReceiptNumber = receptions[0]['receiptNumber'] as string;
      const lastNumber = parseInt(lastReceiptNumber.split('-')[2]);
      const nextNumber = String(lastNumber + 1).padStart(3, '0');
      
      return `BR-${year}-${nextNumber}`;
    } catch (error) {
      // En cas d'erreur, générer un numéro basé sur le timestamp
      console.warn('Erreur lors de la génération du numéro de bon, utilisation d\'un numéro basé sur le timestamp:', error);
      const timestamp = Date.now();
      const uniqueId = String(timestamp).slice(-3);
      return `BR-${year}-${uniqueId}`;
    }
  }

  closeReceptionModal(): void {
    this.showReceptionModal.set(false);
    this.receptionForm.reset();
  }

  get receptionItems(): FormArray {
    return this.receptionForm.get('items') as FormArray;
  }

  addReceptionItem(): void {
    const items = this.receptionItems;
    items.push(this.fb.group({
      productId: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.01)]]
    }));
  }

  removeReceptionItem(index: number): void {
    const items = this.receptionItems;
    items.removeAt(index);
  }

  async submitReception(): Promise<void> {
    if (this.receptionForm.invalid) {
      return;
    }

    const formValue = this.receptionForm.value;
    const items = formValue.items as Array<{ productId: string; quantity: number }>;

    if (items.length === 0) {
      Swal.fire('Erreur', 'Veuillez ajouter au moins un produit', 'error');
      return;
    }

    try {
      const user = this.authState.user();
      const receiptDate = new Date(formValue.receiptDate);

      // Process each item
      for (const item of items) {
        const product = this.allProducts().find(p => p.id === item.productId);
        if (!product) continue;

        const previousStock = product.stock;
        const newStock = previousStock + item.quantity;

        // Update stock
        await this.productsService.updateStock(product.id, newStock);
        
        // Activate product if it's not already active
        if (!product.isActive) {
          await this.productsService.toggleActive(product.id, true);
        }

        // Create movement record
        await this.stockMovementsService.create({
          productId: product.id,
          productName: product.name,
          type: 'reception',
          quantity: item.quantity,
          previousStock,
          newStock,
          reason: `Réception - Bon n°${formValue.receiptNumber}`,
          notes: formValue.supplier ? `Fournisseur: ${formValue.supplier}` : undefined,
          receiptNumber: formValue.receiptNumber,
          supplier: formValue.supplier || undefined,
          receiptDate,
          createdBy: user?.uid || 'system',
          createdByName: user?.email || 'Système'
        });
      }

      Swal.fire('Succès', 'Réception enregistrée avec succès', 'success');
      this.closeReceptionModal();
      this.loadData();
    } catch (error) {
      console.error('Erreur lors de la réception:', error);
      Swal.fire('Erreur', 'Impossible d\'enregistrer la réception', 'error');
    }
  }

  // Movement history
  async openHistoryModal(product: Product): Promise<void> {
    this.selectedProduct.set(product);
    this.isLoading.set(true);
    
    this.stockMovementsService.getByProduct(product.id).subscribe({
      next: (movements) => {
        this.selectedProductMovements.set(movements);
        this.showHistoryModal.set(true);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'historique:', error);
        Swal.fire('Erreur', 'Impossible de charger l\'historique', 'error');
        this.isLoading.set(false);
      }
    });
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.selectedProduct.set(null);
    this.selectedProductMovements.set([]);
  }

  getMovementTypeLabel(type: StockMovementType): string {
    const labels: Record<StockMovementType, string> = {
      'reception': 'Réception',
      'sale': 'Vente',
      'adjustment': 'Ajustement',
      'loss': 'Perte',
      'return': 'Retour',
      'correction': 'Correction'
    };
    return labels[type] || type;
  }

  getAdjustmentTypeLabel(type?: AdjustmentType): string {
    if (!type) return '';
    const labels: Record<AdjustmentType, string> = {
      'positive': 'Ajout',
      'negative': 'Retrait',
      'correction': 'Correction'
    };
    return labels[type] || type;
  }
}
