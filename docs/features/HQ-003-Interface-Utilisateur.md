# HQ-003 — Interface utilisateur

## Objectif

Permettre l'ouverture, l'affichage et la soumission d'un questionnaire santé
depuis une sidebar Google Sheets.

## Fonctionnalités

- menu AKS Platform ;
- ouverture de la sidebar ;
- chargement de la campagne active ;
- rendu dynamique des questions ;
- soumission des réponses ;
- configuration de la campagne active ;
- messages d'erreur et de confirmation.

## Fonctions publiques

- `AKS_openHealthQuestionnaire`
- `AKS_getHealthQuestionnaireContext`
- `AKS_submitHealthQuestionnaire`
- `AKS_configureActiveHealthCampaign`

## Tests

Exécuter :

```javascript
AKS_runHQ003Tests
```

Résultat attendu :

```text
{ok=true, feature=HQ-003, passed=4, total=4}
```

## Commit

```text
feat(health-questionnaire): add sidebar interface
```
