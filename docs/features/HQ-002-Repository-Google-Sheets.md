# HQ-002 — Repository Google Sheets

## Objectif

Persister les campagnes, les questionnaires et les soumissions du module
Questionnaire santé dans Google Sheets sans introduire de logique métier dans
la couche d'infrastructure.

## Feuilles créées

- `HQ_Campaigns`
- `HQ_Questionnaires`
- `HQ_Submissions`

## Composants

- contrat de repository ;
- repository en mémoire pour les tests ;
- repository Google Sheets ;
- service applicatif ;
- enregistrement dans le conteneur lors de l'installation.

## Tests automatisés

Les tests utilisent exclusivement le repository en mémoire.

Exécuter :

```javascript
AKS_runHQ002Tests
```

Résultat attendu :

```text
{ok=true, feature=HQ-002, passed=5, total=5}
```

## Installation réelle

Exécuter :

```javascript
AKS_install
```

Les trois feuilles sont créées dans le classeur associé au projet Apps Script.

## Commit

```text
feat(health-questionnaire): add sheets repository
```
