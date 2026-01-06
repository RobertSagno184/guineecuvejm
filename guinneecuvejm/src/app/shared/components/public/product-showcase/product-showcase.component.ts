import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicProduct } from '../../../../shared/models/public-product.model';
import { PublicProductCardComponent } from '../public-product-card/public-product-card.component';

@Component({
  selector: 'app-product-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicProductCardComponent],
  templateUrl: './product-showcase.component.html',
  styleUrl: './product-showcase.component.scss'
})
export class ProductShowcaseComponent {
  products = input<PublicProduct[]>([]);
  title = input<string>('Produits phares');
  showViewAll = input<boolean>(true);
}

