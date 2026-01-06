import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../../core/services/public/seo.service';

@Component({
  selector: 'app-legal',
  standalone: true,
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss'
})
export class LegalComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Mentions Légales - Guinée Cuve Plastique'
    });
  }
}

