# Guide de Style - Guinée Cuve JM

## 🎨 Système de Design

### Framework CSS utilisé

**NG-ZORRO** est le framework principal utilisé pour les composants UI complexes.

**Bootstrap** est installé mais **non utilisé** actuellement. Il peut être retiré si nécessaire.

### Gestion des Couleurs

Toutes les couleurs sont centralisées dans le fichier `src/assets/styles/_variables.scss`.

#### Utilisation des variables

**✅ CORRECT** - Utiliser les variables SCSS :
```scss
@use '../../../../assets/styles/variables' as *;

.my-component {
  background-color: $primary-color;
  color: $text-color;
  border: 1px solid $border-color;
}
```

**❌ INCORRECT** - Utiliser des couleurs en dur :
```scss
.my-component {
  background-color: #0b84ff; // ❌ Ne pas faire ça
  color: #1f2933; // ❌ Ne pas faire ça
}
```

### Variables de couleurs disponibles

#### Couleurs principales
- `$primary-color`: #0b84ff (bleu eau principal)
- `$primary-color-hover`: #0a6fd4 (bleu eau au survol)
- `$secondary-color`: #00b894 (accent succès)
- `$accent-color`: #ffb347 (accent orange)
- `$danger-color`: #e74c3c (couleur d'erreur)

#### Couleurs de fond
- `$bg-color`: #f5f8fb
- `$bg-color-gradient-end`: #e8f0f5
- `$surface-color`: #ffffff

#### Couleurs de bordure
- `$border-color`: #dde3ec
- `$border-color-light`: #d1d5db
- `$border-color-divider`: #e5e7eb

#### Couleurs de texte
- `$text-color`: #1f2933
- `$text-color-secondary`: #374151
- `$muted-text-color`: #6b7280

#### Couleurs d'état
- `$error-color`: #e74c3c
- `$focus-color`: rgba(11, 132, 255, 0.1)
- `$hover-bg-light`: #f3f4f6
- `$hover-bg-primary`: #f0f7ff

### Thème NG-ZORRO

Le thème NG-ZORRO est configuré dans `src/assets/styles/theme.less` et utilise les mêmes couleurs que le système de design principal.

### Structure des fichiers de style

```
src/
├── assets/
│   └── styles/
│       ├── _variables.scss    ← Variables de couleurs (à utiliser partout)
│       ├── _mixins.scss       ← Mixins réutilisables
│       ├── _global.scss       ← Styles globaux
│       └── theme.less          ← Thème NG-ZORRO
├── app/
│   └── [composants]/
│       └── *.component.scss   ← Styles des composants (utilisent les variables)
```

### Bonnes pratiques

1. **Toujours utiliser les variables** : Ne jamais écrire de couleurs en dur dans les fichiers de style
2. **Utiliser SCSS** : Préférer `.scss` à `.css` pour bénéficier des variables
3. **Importer les variables** : Utiliser `@use` pour importer les variables dans chaque composant
4. **NG-ZORRO pour les composants complexes** : Utiliser les composants NG-ZORRO pour les tables, formulaires complexes, modals, etc.
5. **Styles personnalisés pour les composants simples** : Utiliser SCSS pour les composants simples et spécifiques

### Exemple d'utilisation

```scss
// login.component.scss
@use '../../../../assets/styles/variables' as *;

.login-container {
  background: linear-gradient(135deg, $bg-color 0%, $bg-color-gradient-end 100%);
}

.btn-primary {
  background-color: $primary-color;
  color: white;
  
  &:hover {
    background-color: $primary-color-hover;
  }
}
```

