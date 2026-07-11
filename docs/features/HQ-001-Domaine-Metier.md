# HQ-001 — Domaine métier

## Objectif

Définir un domaine générique de questionnaire santé indépendant de toute
fédération, de tout support de stockage et de toute interface utilisateur.

## Entités

- `HealthCampaign`
- `Questionnaire`
- `Question`
- `Submission`
- `Evaluation`
- `Certificate`

## Règles principales

- les questionnaires sont versionnés ;
- les questions sont ordonnées et identifiées de manière unique ;
- les réponses autorisées sont `YES` et `NO` ;
- une réponse positive entraîne `MEDICAL_REVIEW_REQUIRED` ;
- une réponse obligatoire manquante entraîne `INCOMPLETE` ;
- l'absence de déclaration acceptée entraîne `INCOMPLETE`.

## Tests

Exécuter :

```javascript
AKS_runHQ001Tests
```

Résultat attendu :

```text
{ok=true, feature=HQ-001, passed=8, total=8}
```

## Commit

```text
feat(health-questionnaire): add generic domain model
```
