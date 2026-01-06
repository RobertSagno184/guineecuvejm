import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../../core/services/public/seo.service';
import { TestimonialCardComponent } from '../../../shared/components/public/testimonial-card/testimonial-card.component';
import { Testimonial } from '../../../shared/models/testimonial.model';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule, TestimonialCardComponent],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss'
})
export class TestimonialsComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  testimonials: Testimonial[] = [
    {
      id: '1',
      clientName: 'Mamadou Diallo',
      company: 'Entreprise ABC',
      rating: 5,
      comment: 'Excellent service et produits de qualité. La cuve est très solide et répond parfaitement à nos besoins. L\'équipe a été très professionnelle et réactive.',
      date: new Date('2024-01-15'),
      projectType: 'Cuve 2000L',
      isPublished: true
    },
    {
      id: '2',
      clientName: 'Fatou Camara',
      company: 'Restaurant Le Gourmet',
      rating: 5,
      comment: 'Livraison rapide et installation professionnelle. Nous recommandons vivement Guinée Cuve Plastique. Le service client est au top !',
      date: new Date('2024-02-20'),
      projectType: 'Cuve 5000L',
      isPublished: true
    },
    {
      id: '3',
      clientName: 'Ibrahima Bah',
      company: 'Ferme Agricole',
      rating: 4,
      comment: 'Très satisfait de notre achat. La qualité est au rendez-vous et le prix est compétitif. Parfait pour nos besoins agricoles.',
      date: new Date('2024-03-10'),
      projectType: 'Cuve 1000L',
      isPublished: true
    },
    {
      id: '4',
      clientName: 'Aissatou Diallo',
      company: 'Hôtel Le Rivage',
      rating: 5,
      comment: 'Service exceptionnel ! La cuve a été livrée et installée dans les délais. L\'équipe est très professionnelle et à l\'écoute.',
      date: new Date('2024-04-05'),
      projectType: 'Cuve 10000L',
      isPublished: true
    }
  ];

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Témoignages Clients - Guinée Cuve Plastique',
      description: 'Découvrez les avis et témoignages de nos clients satisfaits. Plus de 200 clients nous font confiance pour leurs besoins en stockage d\'eau.',
      keywords: 'témoignages, avis clients, satisfaction client, cuve plastique'
    });
  }
}

