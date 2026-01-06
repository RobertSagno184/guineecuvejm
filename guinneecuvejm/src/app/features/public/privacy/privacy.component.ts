import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../../core/services/public/seo.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Politique de Confidentialité - Guinée Cuve Plastique'
    });
  }
}

