# Release Notes — F-002 Service Container

## Installation

Décompresser le package à la racine de `C:\AKS-Platform`.

## Synchronisation

```powershell
clasp push --force
```

## Test

Exécuter dans Apps Script :

```javascript
AKS_runFeatureF002Tests
```

## Résultat attendu

```text
{ok=true, feature=F-002, passed=9, total=9}
```

## Commandes Git

```powershell
git status
git add .
git commit -m "feat(core): add dependency container"
git push
```
