# Correctif HQ-002 — collisions de composants

## Cause

Des composants hérités utilisaient encore les noms :

- `InMemoryRepository`
- `SheetsRepository`
- `Service`

Apps Script pouvait charger l'ancienne définition à la place de HQ-002.

## Nouveaux noms

- `HealthQuestionnaireInMemoryRepository`
- `HealthQuestionnaireSheetsRepository`
- `HealthQuestionnaireApplicationService`

## Nettoyage obligatoire

Supprimer les anciens fichiers avant le `clasp push --force` :

```powershell
Remove-Item .\src\modules\health-questionnaire\infrastructure\InMemoryRepository.gs -ErrorAction SilentlyContinue
Remove-Item .\src\modules\health-questionnaire\infrastructure\SheetsRepository.gs -ErrorAction SilentlyContinue
```

## Test

```javascript
AKS_runHQ002Tests
```

Résultat attendu :

```text
{ok=true, feature=HQ-002, passed=5, total=5}
```
