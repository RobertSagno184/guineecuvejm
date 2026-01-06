import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthState } from '../auth/auth.state';

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  folder?: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  };
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly cloudName = environment.cloudinary?.cloudName || '';
  private readonly uploadPreset = environment.cloudinary?.uploadPreset || '';

  /**
   * Upload une image vers Cloudinary
   * @param file Fichier à uploader
   * @param options Options d'upload (folder, transformations, etc.)
   * @returns Observable avec la réponse Cloudinary
   */
  uploadImage(
    file: File,
    options: CloudinaryUploadOptions = {}
  ): Observable<CloudinaryUploadResponse> {
    if (!this.cloudName || !this.uploadPreset) {
      return throwError(() => new Error('Configuration Cloudinary manquante. Vérifiez environment.ts'));
    }

    if (!this.authState.isAuthenticated()) {
      return throwError(() => new Error('Vous devez être connecté pour uploader une image.'));
    }

    // Valider le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return throwError(() => new Error('Type de fichier non autorisé. Utilisez JPG, PNG, WEBP ou GIF.'));
    }

    // Valider la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return throwError(() => new Error('Le fichier est trop volumineux. Taille maximale : 10MB.'));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    
    // Avec un preset unsigned, on ne peut pas envoyer de transformations lors de l'upload
    // Les transformations doivent être configurées dans l'Upload Preset ou appliquées lors de l'affichage
    if (options.folder) {
      formData.append('folder', options.folder);
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    return this.http.post<CloudinaryUploadResponse>(uploadUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event) => {
        if (event.type === HttpEventType.Response && event.body) {
          return event.body;
        }
        throw new Error('Upload incomplet');
      }),
      catchError((error) => {
        console.error('Erreur lors de l\'upload Cloudinary:', error);
        return throwError(() => new Error(
          error.error?.error?.message || 
          'Erreur lors de l\'upload de l\'image. Veuillez réessayer.'
        ));
      })
    );
  }

  /**
   * Upload avec suivi de progression
   */
  uploadImageWithProgress(
    file: File,
    options: CloudinaryUploadOptions = {}
  ): Observable<{ progress?: UploadProgress; response?: CloudinaryUploadResponse }> {
    if (!this.cloudName || !this.uploadPreset) {
      return throwError(() => new Error('Configuration Cloudinary manquante.'));
    }

    if (!this.authState.isAuthenticated()) {
      return throwError(() => new Error('Vous devez être connecté pour uploader une image.'));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    
    // Avec un preset unsigned, on ne peut pas envoyer de transformations lors de l'upload
    // Les transformations doivent être configurées dans l'Upload Preset ou appliquées lors de l'affichage
    if (options.folder) {
      formData.append('folder', options.folder);
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    return this.http.post<CloudinaryUploadResponse>(uploadUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          return {
            progress: {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((100 * event.loaded) / event.total)
            }
          };
        } else if (event.type === HttpEventType.Response && event.body) {
          return { response: event.body };
        }
        return {};
      }),
      catchError((error) => {
        console.error('Erreur lors de l\'upload Cloudinary:', error);
        return throwError(() => new Error(
          error.error?.error?.message || 
          'Erreur lors de l\'upload de l\'image. Veuillez réessayer.'
        ));
      })
    );
  }

  /**
   * Génère une URL optimisée avec transformations
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    } = {}
  ): string {
    if (!this.cloudName) {
      return '';
    }

    const transformations: string[] = [];
    
    if (options.width || options.height) {
      transformations.push(`w_${options.width || 'auto'},h_${options.height || 'auto'}`);
    }
    
    if (options.crop) {
      transformations.push(`c_${options.crop}`);
    }
    
    if (options.quality) {
      transformations.push(`q_${options.quality}`);
    } else {
      transformations.push('q_auto');
    }
    
    if (options.format) {
      transformations.push(`f_${options.format}`);
    } else {
      transformations.push('f_auto');
    }

    const transformationString = transformations.join(',');
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformationString}/${publicId}`;
  }

  /**
   * Supprime une image de Cloudinary
   * Note: Nécessite une signature côté serveur pour la sécurité
   */
  deleteImage(publicId: string): Observable<void> {
    // Pour la suppression, il est recommandé d'utiliser une API backend
    // car cela nécessite la clé API secrète
    return throwError(() => new Error('La suppression doit être effectuée via une API backend sécurisée.'));
  }
}

