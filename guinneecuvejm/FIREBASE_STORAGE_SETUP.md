# Configuration Firebase Storage

## Problème : Erreur CORS lors de l'upload d'images

Si vous rencontrez l'erreur `net::ERR_FAILED` ou `CORS policy` lors de l'upload d'images, cela signifie que les règles de sécurité Firebase Storage ne sont pas correctement configurées.

## Solution : Configurer les règles de sécurité Firebase Storage

### Étape 1 : Accéder à la console Firebase

1. Allez sur [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Sélectionnez votre projet : `guinnecuvejm`
3. Dans le menu de gauche, cliquez sur **Storage**
4. Cliquez sur l'onglet **Règles**

### Étape 2 : Configurer les règles de sécurité

Remplacez les règles par défaut par les règles suivantes :

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Règle pour les images de produits
    match /products/{productId}/{fileName} {
      // Permettre l'upload et la lecture uniquement aux utilisateurs authentifiés
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024  // Max 5MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Règle par défaut : refuser tout accès non autorisé
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Étape 3 : Publier les règles

1. Cliquez sur **Publier** pour sauvegarder les règles
2. Attendez quelques secondes que les règles soient déployées

### Étape 4 : Vérifier la configuration

1. Assurez-vous que **Storage** est activé dans votre projet Firebase
2. Vérifiez que l'authentification est bien configurée
3. Testez l'upload d'une image depuis l'application

## Règles de sécurité recommandées pour la production

Pour la production, vous pouvez restreindre davantage les règles :

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Règle pour les images de produits
    match /products/{productId}/{fileName} {
      // Permettre la lecture à tous les utilisateurs authentifiés
      allow read: if request.auth != null;
      
      // Permettre l'upload uniquement aux admins et gérants
      allow write: if request.auth != null 
                   && (request.auth.token.role == 'admin' || request.auth.token.role == 'gérant')
                   && request.resource.size < 5 * 1024 * 1024  // Max 5MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Règle par défaut : refuser tout accès
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Note** : Pour utiliser les règles basées sur les rôles personnalisés, vous devez configurer les **Custom Claims** dans Firebase Authentication.

## Vérification du storageBucket

Assurez-vous que le `storageBucket` dans `src/environments/environment.ts` est correct :

```typescript
storageBucket: "guinnecuvejm.firebasestorage.app"
```

Si vous utilisez un ancien format, il pourrait être :
```typescript
storageBucket: "guinnecuvejm.appspot.com"
```

## Dépannage

### Erreur persistante après configuration des règles

1. Vérifiez que vous êtes bien connecté dans l'application
2. Vérifiez que l'utilisateur a bien un rôle (admin ou gérant)
3. Vérifiez la console du navigateur pour d'autres erreurs
4. Attendez quelques minutes après la publication des règles

### Tester les règles

Vous pouvez tester les règles directement dans la console Firebase :
1. Allez dans **Storage** > **Règles**
2. Cliquez sur **Simulateur**
3. Testez différents scénarios

## Support

Si le problème persiste, vérifiez :
- La documentation Firebase Storage : [https://firebase.google.com/docs/storage/security](https://firebase.google.com/docs/storage/security)
- Les logs de la console Firebase pour plus de détails


