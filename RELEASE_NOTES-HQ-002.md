# Release Notes — HQ-002 Repository Google Sheets

## Installation

Décompresser l'archive à la racine de `C:\AKS-Platform`.

## Synchronisation

```powershell
clasp push --force
```

## Tests

Exécuter :

```javascript
AKS_runHQ002Tests
```

Résultat attendu :

```text
{ok=true, feature=HQ-002, passed=5, total=5}
```

## Création du stockage

Exécuter :

```javascript
AKS_install
```

Les feuilles suivantes doivent apparaître :

- `HQ_Campaigns`
- `HQ_Questionnaires`
- `HQ_Submissions`

## Commandes Git

```powershell
git status
git add .
git commit -m "feat(health-questionnaire): add sheets repository"
git push
```
