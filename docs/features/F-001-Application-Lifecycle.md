# F-001 — Application Lifecycle

## Objectif

Centraliser le cycle de vie d'AKS Platform derrière trois points d'entrée publics :

- `AKS_start`
- `AKS_install`
- `onOpen`

## Responsabilités

- démarrer l'application ;
- enregistrer les services du Core ;
- charger les modules déclarés ;
- installer les modules ;
- construire le menu Google Sheets ;
- garantir un démarrage idempotent.

## Fichiers

- `src/app/EntryPoints.gs`
- `src/app/Bootstrap.gs`
- `src/app/Menu.gs`
- `src/core/application/Application.gs`
- `src/core/application/ModuleLoader.gs`
- `src/modules/health-questionnaire/Module.gs`
- `src/tests/core/ApplicationLifecycleTest.gs`
- `src/tests/core/RunFeatureF001Tests.gs`

## Tests

Exécuter :

```javascript
AKS_runFeatureF001Tests
```

Résultat attendu :

```text
{ok=true, feature=F-001, passed=3, total=3}
```

## Commit

```text
feat(core): implement application lifecycle
```
