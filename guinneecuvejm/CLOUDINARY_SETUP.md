# Configuration Cloudinary

Ce guide vous explique comment configurer Cloudinary pour remplacer Firebase Storage dans votre application Angular.

## 📋 Prérequis

1. Un compte Cloudinary (gratuit disponible sur [cloudinary.com](https://cloudinary.com))
2. Votre Cloud Name et Upload Preset

## 🔧 Configuration

### Étape 1 : Créer un compte Cloudinary

1. Allez sur [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Créez un compte gratuit
3. Une fois connecté, vous verrez votre **Cloud Name** dans le Dashboard

### Étape 2 : Créer un Upload Preset

1. Dans le Dashboard Cloudinary, allez dans **Settings** > **Upload**
2. Cliquez sur **Add upload preset**
3. Configurez le preset :
   - **Preset name** : `guinneecuvejm-upload` (ou un nom de votre choix)
   - **Signing mode** : `Unsigned` (pour permettre les uploads depuis le frontend)
   - **Folder** : `products` (optionnel, pour organiser les images)
   - **Format** : `Auto` (pour conversion automatique en WebP)
   - **Quality** : `Auto` (pour optimisation automatique)
4. Cliquez sur **Save**

### Étape 3 : Configurer l'application

1. Ouvrez `src/environments/environment.ts`
2. Remplacez les valeurs par défaut :

```typescript
cloudinary: {
  cloudName: 'VOTRE_CLOUD_NAME', // Exemple: 'dxyz1234'
  uploadPreset: 'VOTRE_UPLOAD_PRESET' // Exemple: 'guinneecuvejm-upload'
}
```

3. Faites de même pour `src/environments/environment.prod.ts`

### Étape 4 : Vérifier la configuration

Les fichiers suivants ont été créés/modifiés :

- ✅ `src/app/core/services/cloudinary/cloudinary.service.ts` - Service Cloudinary
- ✅ `src/app/shared/components/image-upload/image-upload.component.ts` - Composant d'upload
- ✅ `src/app/shared/components/cloudinary-image/cloudinary-image.component.ts` - Composant d'affichage optimisé
- ✅ `src/app/core/services/firebase/products.service.ts` - Mis à jour pour utiliser Cloudinary

## 🚀 Fonctionnalités

### Upload d'images

- ✅ Drag & drop
- ✅ Preview en temps réel
- ✅ Compression automatique
- ✅ Barre de progression
- ✅ Validation (taille, format)
- ✅ Support multi-images

### Optimisations Cloudinary

- ✅ Conversion automatique en WebP
- ✅ Optimisation de qualité automatique
- ✅ Redimensionnement à la volée
- ✅ CDN global
- ✅ Organisation par dossiers

### Intégration Firebase

- ✅ Métadonnées stockées dans Firestore
- ✅ Synchronisation temps réel
- ✅ Sécurité par utilisateur
- ✅ Historique des uploads

### Affichage optimisé

- ✅ Lazy loading automatique
- ✅ Placeholders pendant chargement
- ✅ Images responsives
- ✅ Cache intelligent

## 📝 Utilisation

### Dans un formulaire de produit

```html
<app-image-upload
  [existingImages]="product.images"
  [maxFiles]="10"
  [maxSize]="10485760"
  folder="products"
  [enableCompression]="true"
  (imagesChange)="onImagesChange($event)"
  (uploadComplete)="onUploadComplete($event)"
></app-image-upload>
```

### Affichage d'image optimisée

```html
<app-cloudinary-image
  [src]="imageUrl"
  [alt]="product.name"
  [width]="800"
  [height]="600"
  [lazy]="true"
></app-cloudinary-image>
```

## 🔒 Sécurité

### Upload Preset Unsigned

Pour la production, il est recommandé de :

1. Créer un Upload Preset avec restrictions :
   - Limiter les formats acceptés
   - Limiter la taille maximale
   - Définir des transformations par défaut

2. Ou utiliser un Upload Preset signé avec une API backend :
   - Générer des signatures côté serveur
   - Valider les uploads avant traitement

### Suppression d'images

La suppression d'images nécessite la clé API secrète, donc doit être effectuée via une API backend sécurisée.

## 🐛 Dépannage

### Erreur : "Configuration Cloudinary manquante"

Vérifiez que `environment.cloudinary.cloudName` et `environment.cloudinary.uploadPreset` sont correctement configurés.

### Erreur : "Upload failed"

1. Vérifiez que votre Upload Preset est en mode "Unsigned"
2. Vérifiez que le Cloud Name est correct
3. Vérifiez la console du navigateur pour plus de détails

### Images non optimisées

Assurez-vous que les transformations sont correctement configurées dans le service Cloudinary.

## 📚 Ressources

- [Documentation Cloudinary](https://cloudinary.com/documentation)
- [Cloudinary Angular SDK](https://cloudinary.com/documentation/angular_integration)
- [Upload Presets](https://cloudinary.com/documentation/upload_presets)

## 🔄 Migration depuis Firebase Storage

Les images existantes dans Firebase Storage continueront de fonctionner. Les nouvelles images seront uploadées vers Cloudinary.

Pour migrer les images existantes :
1. Téléchargez les images depuis Firebase Storage
2. Re-uploadez-les via le nouveau composant Cloudinary
3. Mettez à jour les URLs dans Firestore

