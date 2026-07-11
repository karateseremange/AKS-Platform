# Release Notes — HQ-003 Interface utilisateur

## Installation

Décompresser l'archive à la racine de `C:\AKS-Platform`.

## Synchronisation

```powershell
clasp push --force
```

## Tests

```javascript
AKS_runHQ003Tests
```

Résultat attendu :

```text
{ok=true, feature=HQ-003, passed=4, total=4}
```

## Utilisation

1. Exécuter `AKS_install`.
2. Renseigner une campagne et un questionnaire dans les feuilles.
3. Recharger le classeur Google Sheets.
4. Utiliser le menu `AKS Platform`.
5. Configurer la campagne active.
6. Ouvrir le questionnaire santé.

## Commandes Git

```powershell
git status
git add .
git commit -m "feat(health-questionnaire): add sidebar interface"
git push
```
