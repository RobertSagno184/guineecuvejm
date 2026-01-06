import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs/operators';

export interface SeoData {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly defaultTitle = 'Guinée Cuve Plastique - Expert en cuves plastique';
  private readonly defaultDescription = 'Guinée Cuve Plastique, votre spécialiste en cuves plastique pour le stockage d\'eau. Catalogue complet, livraison sur mesure, garantie qualité.';
  private readonly defaultImage = '/assets/images/logo.png';
  private readonly siteUrl = 'https://guineecuveplastique.com';

  constructor() {
    // Écouter les changements de route pour mettre à jour le SEO (uniquement côté client)
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          // Le SEO sera mis à jour par chaque composant via updateTags
        });
    }
  }

  /**
   * Mettre à jour les meta tags
   */
  updateTags(data: SeoData): void {
    const title = data.title || this.defaultTitle;
    const description = data.description || this.defaultDescription;
    const image = data.image || this.defaultImage;
    const url = data.url || `${this.siteUrl}${this.router.url}`;
    const type = data.type || 'website';

    // Title
    this.title.setTitle(title);

    // Meta tags standards
    this.meta.updateTag({ name: 'description', content: description });
    if (data.keywords) {
      this.meta.updateTag({ name: 'keywords', content: data.keywords });
    }

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: type });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  /**
   * Ajouter des meta tags pour un produit (Schema.org)
   */
  addProductSchema(product: {
    name: string;
    description: string;
    image: string;
    category: string;
  }): void {
    // Vérifier qu'on est dans le navigateur
    if (!isPlatformBrowser(this.platformId)) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.image,
      category: product.category
    };

    // Créer un script tag pour le schema
    let script = document.querySelector('script[type="application/ld+json"][data-product]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-product', 'true');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  /**
   * Réinitialiser les tags par défaut
   */
  resetTags(): void {
    this.updateTags({
      title: this.defaultTitle,
      description: this.defaultDescription
    });
  }
}

