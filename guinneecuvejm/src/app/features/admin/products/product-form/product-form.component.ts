import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../../../core/services/firebase/products.service';
import { Product } from '../../../../shared/models/product.model';
import { ImageUploadComponent, ImageUploadItem } from '../../../../shared/components/image-upload/image-upload.component';
import { CloudinaryUploadResponse } from '../../../../core/services/cloudinary/cloudinary.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploadComponent],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);

  @ViewChild(ImageUploadComponent) imageUploadComponent?: ImageUploadComponent;

  readonly isEditMode = signal(false);
  readonly productId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly uploadedImages = signal<string[]>([]);
  readonly currentImageUrls = signal<string[]>([]);

  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    category: ['cuve', [Validators.required]],
    capacity: [0, [Validators.required, Validators.min(0)]],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    minStock: [0, [Validators.required, Validators.min(0)]],
    specifications: this.fb.group({
      height: [0, [Validators.required, Validators.min(0)]],
      diameter: [0, [Validators.required, Validators.min(0)]],
      weight: [0, [Validators.required, Validators.min(0)]],
      color: ['', [Validators.required]],
    }),
    isActive: [true],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.productId.set(id);
      this.loadProduct(id);
    }
  }

  private loadProduct(id: string): void {
    this.isLoading.set(true);
    this.productsService.getById(id).subscribe({
      next: (product) => {
        if (product) {
          this.productForm.patchValue({
            name: product.name,
            description: product.description,
            category: product.category,
            capacity: product.capacity,
            price: product.price,
            stock: product.stock,
            minStock: product.minStock,
            specifications: product.specifications,
            isActive: product.isActive,
          });
          this.uploadedImages.set(product.images || []);
          // Les images existantes seront chargées via @Input dans le composant
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement du produit:', error);
        this.isLoading.set(false);
      }
    });
  }

  onImagesChange(images: ImageUploadItem[]): void {
    // Mettre à jour les URLs d'images actuelles
    const urls = images
      .map(img => img.url || img.preview)
      .filter((url): url is string => !!url && url.startsWith('http'));
    this.currentImageUrls.set(urls);
  }

  onUploadComplete(responses: CloudinaryUploadResponse[]): void {
    // Les uploads sont terminés
    console.log('Uploads terminés:', responses);
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const formValue = this.productForm.value;
      
      // Collecter toutes les URLs d'images
      let allImageUrls: string[] = [];
      
      // Utiliser les URLs existantes (chargées depuis le produit en édition)
      const existingUrls = this.uploadedImages().filter(url => url && url.startsWith('http'));
      allImageUrls.push(...existingUrls);
      
      // Utiliser les URLs mises à jour via onImagesChange
      const currentUrls = this.currentImageUrls();
      allImageUrls.push(...currentUrls);
      
      // Uploader les nouvelles images si le composant est disponible
      if (this.imageUploadComponent) {
        try {
          const uploadResponses = await this.imageUploadComponent.uploadAll();
          const newImageUrls = uploadResponses.map(res => res.secure_url);
          allImageUrls.push(...newImageUrls);
        } catch (error) {
          console.error('Erreur lors de l\'upload des images:', error);
          // Continuer même si l'upload échoue, on garde les URLs existantes
        }
      }
      
      // Éliminer les doublons et ne garder que les URLs valides
      allImageUrls = [...new Set(allImageUrls.filter(url => url && url.startsWith('http')))];

      const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formValue.name,
        description: formValue.description,
        category: formValue.category,
        capacity: formValue.capacity,
        price: formValue.price,
        stock: formValue.stock,
        minStock: formValue.minStock,
        images: allImageUrls,
        specifications: formValue.specifications,
        isActive: formValue.isActive,
      };

      if (this.isEditMode() && this.productId()) {
        // Mode édition : mettre à jour le produit
        await this.productsService.update(this.productId()!, productData);
      } else {
        // Mode création : créer le produit
        const id = await this.productsService.create(productData);
        
        // Si des images ont été uploadées avec un dossier temporaire, on peut les réorganiser
        // mais normalement elles sont déjà dans le bon dossier
      }

      await Swal.fire({
        title: 'Succès !',
        text: this.isEditMode() 
          ? 'Le produit a été modifié avec succès.' 
          : 'Le produit a été créé avec succès.',
        icon: 'success',
        confirmButtonColor: '#ff9800',
        timer: 2000
      });
      this.router.navigate(['/admin/products']);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: error.message || 'Une erreur est survenue lors de la sauvegarde.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
      this.isLoading.set(false);
    }
  }

  async cancel(): Promise<void> {
    if (this.productForm.dirty) {
      const result = await Swal.fire({
        title: 'Êtes-vous sûr ?',
        text: 'Les modifications non enregistrées seront perdues.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Oui, quitter',
        cancelButtonText: 'Annuler',
        reverseButtons: true
      });

      if (!result.isConfirmed) {
        return;
      }
    }
    this.router.navigate(['/admin/products']);
  }
}

