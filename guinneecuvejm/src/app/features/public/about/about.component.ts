import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../../core/services/public/seo.service';

@Component({
  selector: 'app-public-about',
  standalone: true,
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'À propos - Guinée Cuve Plastique',
      description: 'Découvrez l\'histoire de Guinée Cuve Plastique, notre mission, nos valeurs et notre engagement envers la qualité et le service client.',
      keywords: 'à propos, histoire entreprise, mission, valeurs, Guinée Cuve Plastique'
    });
  }
}
