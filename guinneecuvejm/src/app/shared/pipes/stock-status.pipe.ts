import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stockStatus',
  standalone: true,
})
export class StockStatusPipe implements PipeTransform {
  transform(quantity: number | null | undefined): string {
    if (quantity == null) {
      return 'Inconnu';
    }
    if (quantity <= 0) {
      return 'Rupture de stock';
    }
    if (quantity < 10) {
      return 'Stock faible';
    }
    return 'En stock';
  }
}


