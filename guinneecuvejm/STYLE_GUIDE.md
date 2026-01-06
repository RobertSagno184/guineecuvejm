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
  background-color: #1e88e5; // ❌ Ne pas faire ça
  color: #37474f; // ❌ Ne pas faire ça
}
```

### Variables de couleurs disponibles

#### Couleurs principales (Charte Graphique - Secteur industriel/eau)
- `$primary-color`: #1e88e5 (Bleu - confiance, eau, professionnel)
- `$primary-color-hover`: #1976d2 (Bleu au survol)
- `$primary-color-light`: #64b5f6 (Bleu clair)
- `$primary-color-dark`: #1565c0 (Bleu foncé)

- `$secondary-color`: #00897b (Vert - écologie, durabilité, plastique)
- `$secondary-color-hover`: #00695c (Vert au survol)
- `$secondary-color-light`: #4db6ac (Vert clair)
- `$secondary-color-dark`: #004d40 (Vert foncé)

- `$accent-color`: #ff9800 (Orange - énergie, action, industrie)
- `$accent-color-hover`: #f57c00 (Orange au survol)
- `$accent-color-light`: #ffb74d (Orange clair)
- `$accent-color-dark`: #e65100 (Orange foncé)

#### Couleurs de fond
- `$bg-color`: #f8f9fa (NEUTRE CLAIR - Fond principal)
- `$bg-color-gradient-end`: #e9ecef (Fond dégradé)
- `$surface-color`: #ffffff (Fond surface - cartes, modals)

#### Couleurs de bordure
- `$border-color`: #dee2e6 (Bordure standard)
- `$border-color-light`: #e9ecef (Bordure légère)
- `$border-color-divider`: #ced4da (Diviseur)

#### Couleurs de texte
- `$text-color`: #37474f (NEUTRE FONCÉ - Texte principal)
- `$text-color-secondary`: #546e7a (Texte secondaire)
- `$muted-text-color`: #78909c (Texte atténué)

#### Couleurs d'état
- `$success-color`: #4caf50 (SUCCÈS - Stock OK)
- `$success-color-hover`: #43a047 (Succès au survol)
- `$success-color-light`: #81c784 (Succès clair)

- `$alert-color`: #ffb300 (ALERTE - Stock faible)
- `$alert-color-hover`: #ffa000 (Alerte au survol)
- `$alert-color-light`: #ffca28 (Alerte clair)

- `$error-color`: #e53935 (ERREUR - Stock épuisé)
- `$error-color-hover`: #d32f2f (Erreur au survol)
- `$error-color-light`: #ef5350 (Erreur clair)

- `$danger-color`: #e53935 (Alias pour $error-color - compatibilité)

#### États interactifs
- `$focus-color`: rgba(30, 136, 229, 0.1) (Focus avec couleur primaire)
- `$hover-bg-light`: #f1f3f5 (Fond hover léger)
- `$hover-bg-primary`: rgba(30, 136, 229, 0.08) (Fond hover primaire)

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

### Classes utilitaires disponibles

Le fichier `_global.scss` fournit des classes utilitaires prêtes à l'emploi :

#### Boutons
- `.btn-primary` - Bouton principal (bleu)
- `.btn-secondary` - Bouton secondaire (vert)
- `.btn-accent` - Bouton accent (orange)
- `.btn-success` - Bouton succès (vert clair)
- `.btn-alert` - Bouton alerte (orange/jaune)
- `.btn-danger` - Bouton erreur (rouge)

#### États de stock
- `.stock-ok` - Badge pour stock disponible
- `.stock-low` - Badge pour stock faible
- `.stock-out` - Badge pour stock épuisé

#### Classes de texte
- `.text-primary`, `.text-secondary`, `.text-accent`
- `.text-success`, `.text-alert`, `.text-error`
- `.text-muted`

#### Classes de fond
- `.bg-primary`, `.bg-secondary`, `.bg-accent`
- `.bg-success`, `.bg-alert`, `.bg-error`
- `.bg-light`, `.bg-surface`

### Exemples d'utilisation

#### Exemple 1 : Composant avec boutons
```scss
// my-component.component.scss
@use '../../../../assets/styles/variables' as *;

.my-component {
  background: $surface-color;
  color: $text-color;
  border: 1px solid $border-color;
  padding: 1.5rem;
  border-radius: 8px;

  .action-button {
    background-color: $primary-color;
    color: white;
    transition: background-color 0.2s ease;
    
    &:hover {
      background-color: $primary-color-hover;
    }
    
    &:focus {
      outline: 2px solid $primary-color;
      outline-offset: 2px;
    }
  }
}
```

#### Exemple 2 : Gestion des états de stock
```scss
// stock-indicator.component.scss
@use '../../../../assets/styles/variables' as *;

.stock-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;

  &.available {
    color: $success-color;
    background-color: rgba($success-color, 0.1);
  }

  &.low {
    color: $alert-color;
    background-color: rgba($alert-color, 0.1);
  }

  &.out {
    color: $error-color;
    background-color: rgba($error-color, 0.1);
  }
}
```

#### Exemple 3 : Utilisation dans le template HTML
```html
<!-- Utilisation des classes utilitaires -->
<div class="stock-ok">En stock</div>
<div class="stock-low">Stock faible</div>
<div class="stock-out">Épuisé</div>

<button class="btn-primary">Action principale</button>
<button class="btn-secondary">Action secondaire</button>
<button class="btn-accent">Action importante</button>

<p class="text-primary">Texte en couleur primaire</p>
<p class="text-muted">Texte atténué</p>
```

#### Exemple 4 : Cartes et surfaces
```scss
// card.component.scss
@use '../../../../assets/styles/variables' as *;

.product-card {
  background: $surface-color;
  border: 1px solid $border-color;
  border-radius: 8px;
  padding: 1.5rem;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: $primary-color;
  }

  .title {
    color: $text-color;
    font-weight: 600;
  }

  .description {
    color: $text-color-secondary;
  }

  .price {
    color: $primary-color;
    font-weight: 700;
  }
}
```

### Migration des anciennes couleurs

Si vous avez des fichiers avec les anciennes couleurs, voici le mapping :

| Ancienne couleur | Nouvelle variable |
|-----------------|-------------------|
| `#0b84ff` | `$primary-color` |
| `#0a6fd4` | `$primary-color-hover` |
| `#00b894` | `$secondary-color` |
| `#ffb347` | `$accent-color` |
| `#e74c3c` | `$error-color` |
| `#1f2933` | `$text-color` |
| `#374151` | `$text-color-secondary` |
| `#f5f8fb` | `$bg-color` |

### Notes importantes

1. **Toujours utiliser `@use`** au lieu de `@import` (déprécié en SCSS)
2. **Les composants NG-ZORRO** utilisent automatiquement le thème défini dans `theme.less`
3. **Les classes utilitaires** sont disponibles globalement via `_global.scss`
4. **Pour les nouveaux composants**, toujours importer les variables en premier

