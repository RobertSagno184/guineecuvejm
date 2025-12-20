import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { Product } from '../../../shared/models/product.model';

@Component({
  selector: 'app-public-catalog',
  standalone: true,
  imports: [NgFor, PricePipe],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent {
  // Données mockées pour l'interface publique
  readonly products: Product[] = [
    {
      id: '1',
      name: 'Cuve 1000L',
      description: 'Cuve plastique 1000 litres pour stockage d’eau.',
      price: 950000,
      stock: 12,
      category: 'Résidentiel',
    },
    {
      id: '2',
      name: 'Cuve 2000L',
      description: 'Idéale pour petites entreprises et commerces.',
      price: 1550000,
      stock: 5,
      category: 'Professionnel',
    },
    {
      id: '3',
      name: 'Cuve 5000L',
      description: 'Grande capacité pour sites industriels ou agricoles.',
      price: 3800000,
      stock: 2,
      category: 'Industriel',
    },
  ];
}



