import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductPublicService } from '../../../core/services/public/product-public.service';
import { SeoService } from '../../../core/services/public/seo.service';
import { PublicProduct } from '../../../shared/models/public-product.model';
import { HeroSliderComponent, HeroSlide } from '../../../shared/components/public/hero-slider/hero-slider.component';
import { ProductShowcaseComponent } from '../../../shared/components/public/product-showcase/product-showcase.component';
import { TestimonialCardComponent } from '../../../shared/components/public/testimonial-card/testimonial-card.component';
import { CallToActionComponent } from '../../../shared/components/public/call-to-action/call-to-action.component';
import { Testimonial } from '../../../shared/models/testimonial.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HeroSliderComponent,
    ProductShowcaseComponent,
    TestimonialCardComponent,
    CallToActionComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly productService = inject(ProductPublicService);
  private readonly seoService = inject(SeoService);

  featuredProducts: PublicProduct[] = [];
  testimonials: Testimonial[] = [];
  heroSlides: HeroSlide[] = [];

  ngOnInit(): void {
    // SEO
    this.seoService.updateTags({
      title: 'Guinée Cuve Plastique - Expert en cuves plastique',
      description: 'Guinée Cuve Plastique, votre spécialiste en cuves plastique pour le stockage d\'eau. Catalogue complet, livraison sur mesure, garantie qualité.',
      keywords: 'cuve plastique, stockage eau, Guinée, cuve 1000L, cuve 2000L, cuve 5000L'
    });

    // Charger les produits phares
    this.productService.getFeatured(6).subscribe(products => {
      this.featuredProducts = products;
    });

    // Témoignages (mock data - à remplacer par un service)
    this.testimonials = [
      {
        id: '1',
        clientName: 'Mamadou Diallo',
        company: 'Entreprise ABC',
        rating: 5,
        comment: 'Excellent service et produits de qualité. La cuve est très solide et répond parfaitement à nos besoins.',
        date: new Date('2024-01-15'),
        projectType: 'Cuve 2000L',
        isPublished: true
      },
      {
        id: '2',
        clientName: 'Fatou Camara',
        company: 'Restaurant Le Gourmet',
        rating: 5,
        comment: 'Livraison rapide et installation professionnelle. Nous recommandons vivement Guinée Cuve Plastique.',
        date: new Date('2024-02-20'),
        projectType: 'Cuve 5000L',
        isPublished: true
      },
      {
        id: '3',
        clientName: 'Ibrahima Bah',
        company: 'Ferme Agricole',
        rating: 4,
        comment: 'Très satisfait de notre achat. La qualité est au rendez-vous et le prix est compétitif.',
        date: new Date('2024-03-10'),
        projectType: 'Cuve 1000L',
        isPublished: true
      }
    ];

    // Hero slides
    this.heroSlides = [
      {
        image: '/assets/images/heros-1.webp',
        title: 'Stockez l\'eau en toute sécurité',
        subtitle: 'Des cuves plastique de qualité pour tous vos besoins',
        ctaText: 'Découvrir nos produits',
        ctaLink: '/public/catalog'
      },
      {
        image: '/assets/images/hero-2.jpg',
        title: 'Expertise et qualité garanties',
        subtitle: 'Plus de 10 ans d\'expérience au service de nos clients',
        ctaText: 'En savoir plus',
        ctaLink: '/public/about'
      }
    ];
  }
}
