# F-002 — Service Container

## Objectif

Introduire un conteneur de dépendances léger pour centraliser les services et
les fabriques d'AKS Platform.

## Capacités

- enregistrer une valeur ;
- enregistrer une fabrique singleton ;
- enregistrer une fabrique transitoire ;
- résoudre une dépendance ;
- supprimer une dépendance ;
- lister les dépendances ;
- réinitialiser le conteneur pour les tests.

## Compatibilité

`AKS.Core.Services` reste disponible comme façade de compatibilité. Les
nouveaux développements doivent utiliser `AKS.Core.Container`.

## Tests

Exécuter :

```javascript
AKS_runFeatureF002Tests
```

Résultat attendu :

```text
{ok=true, feature=F-002, passed=9, total=9}
```

## Commit

```text
feat(core): add dependency container
```
