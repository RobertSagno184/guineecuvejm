import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../../core/services/public/seo.service';
import { ContactFormComponent } from '../../../shared/components/public/contact-form/contact-form.component';

@Component({
  selector: 'app-public-contact',
  standalone: true,
  imports: [CommonModule, ContactFormComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  productInterest: string | null = null;

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Contactez-nous - Guinée Cuve Plastique',
      description: 'Contactez Guinée Cuve Plastique pour toute question sur nos produits, demandes de devis ou informations commerciales.',
      keywords: 'contact cuve plastique, devis cuve, information commerciale'
    });

    this.productInterest = this.route.snapshot.queryParams['product'] || null;
  }
}
