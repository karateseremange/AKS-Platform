# Questionnaire santé v0.1.0

Premier incrément fonctionnel du module métier.

## Inclus

- modèle de questionnaire ;
- modèle de soumission ;
- moteur d'évaluation ;
- service métier ;
- dépôt mémoire pour les tests ;
- stockage Google Sheets ;
- initialisation du stockage ;
- trois tests automatisés manuels.

## Limitation volontaire

Le libellé officiel des questions FFK n'est pas inclus. Il reste externalisé afin d'intégrer le document officiel applicable à la saison et au public concernés sans modifier le moteur.

## Tests

Exécuter `test_runHealthQuestionnaireSuite`.

Résultat attendu : `{ok=true, passed=3, total=3}`.

## Stockage

Exécuter `AKS_healthQuestionnaire_setup` pour créer la feuille `HealthQuestionnaireSubmissions`.
