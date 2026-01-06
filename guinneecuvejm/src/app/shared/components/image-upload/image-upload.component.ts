import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudinaryService, CloudinaryUploadResponse } from '../../../core/services/cloudinary/cloudinary.service';

export interface ImageUploadItem {
  file?: File;
  preview?: string;
  url?: string;
  publicId?: string;
  progress?: number;
  uploading?: boolean;
  error?: string;
}

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss'
})
export class ImageUploadComponent implements OnInit, OnChanges {
  private readonly cloudinaryService = inject(CloudinaryService);

  @Input() maxFiles: number = 10;
  @Input() maxSize: number = 10 * 1024 * 1024; // 10MB par défaut
  @Input() folder: string = 'products';
  @Input() existingImages: string[] = [];
  @Input() enableCompression: boolean = true;
  @Input() compressionQuality: number = 0.8;

  @Output() imagesChange = new EventEmitter<ImageUploadItem[]>();
  @Output() uploadComplete = new EventEmitter<CloudinaryUploadResponse[]>();

  readonly images = signal<ImageUploadItem[]>([]);
  readonly isDragging = signal(false);
  readonly allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  ngOnInit(): void {
    // Charger les images existantes
    if (this.existingImages && this.existingImages.length > 0) {
      const existingItems: ImageUploadItem[] = this.existingImages.map(url => ({
        url,
        preview: url
      }));
      this.images.set(existingItems);
      this.emitChanges();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingImages'] && this.existingImages && this.existingImages.length > 0) {
      const existingItems: ImageUploadItem[] = this.existingImages.map(url => ({
        url,
        preview: url
      }));
      this.images.set(existingItems);
      this.emitChanges();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // Reset input
    }
  }

  private async handleFiles(files: File[]): Promise<void> {
    const currentImages = this.images();
    const remainingSlots = this.maxFiles - currentImages.length;

    if (remainingSlots <= 0) {
      alert(`Vous ne pouvez ajouter que ${this.maxFiles} images maximum.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newImages: ImageUploadItem[] = [];

    for (const file of filesToProcess) {
      // Validation
      if (!this.allowedTypes.includes(file.type)) {
        alert(`Le fichier ${file.name} n'est pas un format d'image valide.`);
        continue;
      }

      if (file.size > this.maxSize) {
        alert(`Le fichier ${file.name} est trop volumineux (max: ${this.maxSize / 1024 / 1024}MB).`);
        continue;
      }

      // Compression si activée
      let processedFile = file;
      if (this.enableCompression && file.type.startsWith('image/')) {
        try {
          processedFile = await this.compressImage(file);
        } catch (error) {
          console.warn('Erreur lors de la compression, utilisation du fichier original:', error);
        }
      }

      // Créer preview
      const preview = await this.createPreview(processedFile);
      
      const imageItem: ImageUploadItem = {
        file: processedFile,
        preview,
        uploading: false,
        progress: 0
      };

      newImages.push(imageItem);
    }

    // Ajouter les nouvelles images
    this.images.set([...currentImages, ...newImages]);
    this.emitChanges();
  }

  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'));
            return;
          }

          // Calculer les nouvelles dimensions (max 1920px de largeur)
          const maxWidth = 1920;
          const maxHeight = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir en blob avec compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Erreur lors de la compression'));
              }
            },
            'image/jpeg',
            this.compressionQuality
          );
        };
        img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsDataURL(file);
    });
  }

  private createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Erreur lors de la création de la preview'));
      reader.readAsDataURL(file);
    });
  }

  async uploadAll(): Promise<CloudinaryUploadResponse[]> {
    const currentImages = this.images();
    const filesToUpload = currentImages.filter(img => img.file && !img.url);

    if (filesToUpload.length === 0) {
      // Si toutes les images sont déjà uploadées, retourner les URLs existantes
      const existingUrls = currentImages.filter(img => img.url).map(img => ({
        secure_url: img.url!,
        public_id: img.publicId || '',
        format: '',
        width: 0,
        height: 0,
        bytes: 0,
        created_at: new Date().toISOString()
      } as CloudinaryUploadResponse));
      return existingUrls;
    }

    // Trouver les indices des fichiers à uploader
    const indicesToUpload: number[] = [];
    currentImages.forEach((img, index) => {
      if (img.file && !img.url) {
        indicesToUpload.push(index);
      }
    });

    const uploadPromises = indicesToUpload.map(index => 
      this.uploadImage(currentImages[index], index)
    );

    try {
      const responses = await Promise.all(uploadPromises);
      this.uploadComplete.emit(responses);
      return responses;
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      throw error;
    }
  }

  private async uploadImage(imageItem: ImageUploadItem, index: number): Promise<CloudinaryUploadResponse> {
    if (!imageItem.file) {
      throw new Error('Aucun fichier à uploader');
    }

    // Mettre à jour l'état - trouver l'index réel dans le tableau
    const currentImages = [...this.images()];
    const realIndex = currentImages.findIndex(img => img === imageItem);
    if (realIndex === -1) {
      throw new Error('Image introuvable dans la liste');
    }

    currentImages[realIndex].uploading = true;
    currentImages[realIndex].progress = 0;
    currentImages[realIndex].error = undefined;
    this.images.set(currentImages);

    return new Promise((resolve, reject) => {
      // Avec un preset unsigned, les transformations doivent être configurées dans l'Upload Preset
      // ou appliquées lors de l'affichage via getOptimizedUrl
      this.cloudinaryService.uploadImageWithProgress(imageItem.file!, {
        folder: this.folder
      }).subscribe({
        next: (event) => {
          if (event.progress) {
            const updatedImages = [...this.images()];
            const realIndex = updatedImages.findIndex(img => img === imageItem);
            if (realIndex !== -1) {
              updatedImages[realIndex].progress = event.progress.percentage;
              this.images.set(updatedImages);
              this.emitChanges();
            }
          }
          
          if (event.response) {
            const updatedImages = [...this.images()];
            const realIndex = updatedImages.findIndex(img => img === imageItem);
            if (realIndex !== -1) {
              updatedImages[realIndex].url = event.response.secure_url;
              updatedImages[realIndex].publicId = event.response.public_id;
              updatedImages[realIndex].uploading = false;
              updatedImages[realIndex].progress = 100;
              updatedImages[realIndex].file = undefined; // Nettoyer
              this.images.set(updatedImages);
              this.emitChanges();
            }
            resolve(event.response);
          }
        },
        error: (error) => {
          const updatedImages = [...this.images()];
          const realIndex = updatedImages.findIndex(img => img === imageItem);
          if (realIndex !== -1) {
            updatedImages[realIndex].uploading = false;
            updatedImages[realIndex].error = error.message || 'Erreur lors de l\'upload';
            updatedImages[realIndex].progress = 0;
            this.images.set(updatedImages);
            this.emitChanges();
          }
          reject(error);
        }
      });
    });
  }

  removeImage(index: number): void {
    const currentImages = this.images();
    currentImages.splice(index, 1);
    this.images.set([...currentImages]);
    this.emitChanges();
  }

  private emitChanges(): void {
    this.imagesChange.emit(this.images());
  }

  getImageUrls(): string[] {
    return this.images()
      .map(img => img.url || img.preview)
      .filter((url): url is string => !!url);
  }
}

