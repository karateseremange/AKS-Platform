# HQ-004 — Modèle de soumission v2

## Statut

À valider dans Apps Script.

## Objectif

Conserver uniquement le résultat administratif du questionnaire santé des mineurs. Les réponses détaillées sont traitées de façon transitoire et ne sont jamais persistées.

## Données persistées

- identifiant interne de soumission ;
- campagne et questionnaire ;
- identité et adresse électronique du mineur ;
- date de naissance et âge au moment de la soumission ;
- sexe ;
- identité de la personne exerçant l’autorité parentale ;
- résultat administratif ;
- horodatages de soumission et de notification ;
- références éventuelles de l’attestation conservée dans Drive.

## Données interdites dans le repository

- réponses détaillées ;
- liste des réponses positives ;
- liste des questions sans réponse.

## Résultats administratifs

- `NO_MEDICAL_CERTIFICATE_REQUIRED` ;
- `MEDICAL_CERTIFICATE_REQUIRED`.

`INCOMPLETE` reste un résultat transitoire de l’évaluation et n’est jamais enregistré.

## Migration Google Sheets

Lors de `AKS_install()`, si `HQ_Submissions` utilise encore l’ancien schéma, la feuille est renommée en `HQ_Submissions_Legacy_yyyyMMdd_HHmmss`. Une nouvelle feuille `HQ_Submissions` est ensuite créée avec le schéma HQ-004. Aucune ancienne donnée n’est supprimée.

## Critères d’acceptation

- aucune colonne `answersJson` dans la nouvelle feuille ;
- aucune réponse détaillée dans un objet `Submission` ;
- refus des personnes majeures ;
- calcul automatique de l’âge ;
- absence de persistance pour un questionnaire incomplet ;
- tests F-001, F-002, HQ-001, HQ-002, HQ-003 et HQ-004 réussis.
