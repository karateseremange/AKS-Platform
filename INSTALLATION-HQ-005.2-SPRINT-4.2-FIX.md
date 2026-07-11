# Correctif HQ-005.2 Sprint 4.2

Ce correctif expose dans l'API publique du contrôleur Web les méthodes déjà implémentées :

- `prepareDeclaration`
- `validateDeclaration`

Aucune logique métier n'est modifiée.

## Installation

Copier le dossier `src` à la racine du dépôt, puis exécuter :

```powershell
clasp push
```

## Tests

```javascript
AKS_runHQ0052Sprint42Tests()
```

Résultat attendu : 6 tests réussis sur 6.
