# Release Notes — HQ-001 Domaine métier

## Installation

Décompresser l'archive à la racine de `C:\AKS-Platform`.

## Synchronisation

```powershell
clasp push --force
```

## Test

Exécuter :

```javascript
AKS_runHQ001Tests
```

## Résultat attendu

```text
{ok=true, feature=HQ-001, passed=8, total=8}
```

## Commandes Git

```powershell
git status
git add .
git commit -m "feat(health-questionnaire): add generic domain model"
git push
```
