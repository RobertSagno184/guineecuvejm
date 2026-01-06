import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/public/seo.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Nos Services - Guinée Cuve Plastique',
      description: 'Découvrez tous nos services : vente de cuves plastique, conseils techniques, livraison sur mesure, installation et garanties.',
      keywords: 'services cuve plastique, livraison, installation, conseil technique, garantie'
    });
  }
}

