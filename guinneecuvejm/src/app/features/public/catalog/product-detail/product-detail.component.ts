import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductPublicService } from '../../../../core/services/public/product-public.service';
import { ContactService } from '../../../../core/services/public/contact.service';
import { SeoService } from '../../../../core/services/public/seo.service';
import { PublicProduct } from '../../../../shared/models/public-product.model';
import { ContactFormComponent } from '../../../../shared/components/public/contact-form/contact-form.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ContactFormComponent, TitleCasePipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductPublicService);
  private readonly contactService = inject(ContactService);
  private readonly seoService = inject(SeoService);

  product: PublicProduct | null = null;
  isLoading = true;
  selectedImageIndex = 0;
  showContactForm = false;

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(productId);
    }
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.productService.getById(id).subscribe({
      next: (product) => {
        if (product) {
          this.product = product;
          this.seoService.updateTags({
            title: `${product.name} - Guinée Cuve Plastique`,
            description: product.description,
            image: product.mainImage
          });
          this.seoService.addProductSchema({
            name: product.name,
            description: product.description,
            image: product.mainImage,
            category: product.category
          });
        } else {
          this.router.navigate(['/public/catalog']);
        }
        this.isLoading = false;
      },
      error: () => {
        this.router.navigate(['/public/catalog']);
        this.isLoading = false;
      }
    });
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  get allImages(): string[] {
    if (!this.product) return [];
    return [this.product.mainImage, ...this.product.galleryImages].filter(Boolean);
  }

  requestQuote(): void {
    this.showContactForm = true;
  }
}

