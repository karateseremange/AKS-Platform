# Release Notes — F-001 Application Lifecycle

## Installation

Décompresser le package à la racine du dépôt `C:\AKS-Platform`.

## Synchronisation

```powershell
clasp push --force
```

## Test

Exécuter dans Apps Script :

```javascript
AKS_runFeatureF001Tests
```

## Résultat attendu

```text
{ok=true, feature=F-001, passed=3, total=3}
```
