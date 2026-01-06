import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudinaryService } from '../../../core/services/cloudinary/cloudinary.service';

@Component({
  selector: 'app-cloudinary-image',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cloudinary-image.component.html',
  styleUrl: './cloudinary-image.component.scss'
})
export class CloudinaryImageComponent implements OnInit, OnChanges {
  private readonly cloudinaryService = inject(CloudinaryService);

  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() width?: number;
  @Input() height?: number;
  @Input() crop: string = 'fill';
  @Input() quality: string | number = 'auto';
  @Input() format: string = 'auto';
  @Input() lazy: boolean = true;
  @Input() placeholder: boolean = true;

  readonly optimizedUrl = signal<string>('');
  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  ngOnInit(): void {
    this.updateOptimizedUrl();
  }

  ngOnChanges(): void {
    this.updateOptimizedUrl();
  }

  private updateOptimizedUrl(): void {
    if (!this.src) {
      this.optimizedUrl.set('');
      return;
    }

    // Si c'est déjà une URL Cloudinary, on peut l'optimiser
    if (this.src.includes('cloudinary.com')) {
      // Extraire le public_id de l'URL Cloudinary
      const publicIdMatch = this.src.match(/\/v\d+\/(.+)$/);
      if (publicIdMatch) {
        const publicId = publicIdMatch[1];
        const optimized = this.cloudinaryService.getOptimizedUrl(publicId, {
          width: this.width,
          height: this.height,
          crop: this.crop,
          quality: this.quality,
          format: this.format
        });
        this.optimizedUrl.set(optimized);
      } else {
        // URL Cloudinary mais format non standard, utiliser tel quel
        this.optimizedUrl.set(this.src);
      }
    } else {
      // URL non Cloudinary, utiliser tel quel
      this.optimizedUrl.set(this.src);
    }
  }

  onLoad(): void {
    this.isLoading.set(false);
  }

  onError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
  }
}

