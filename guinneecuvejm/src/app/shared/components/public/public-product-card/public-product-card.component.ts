import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicProduct } from '../../../../shared/models/public-product.model';

@Component({
  selector: 'app-public-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-product-card.component.html',
  styleUrl: './public-product-card.component.scss'
})
export class PublicProductCardComponent {
  product = input.required<PublicProduct>();

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'cuve': 'Cuve',
      'accessoire': 'Accessoire',
      'pompe': 'Pompe'
    };
    return labels[category] || category;
  }
}

