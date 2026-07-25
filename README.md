# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version en préparation

La branche `develop` contient **AKS Platform 1.1.0 — Consolidation de la plateforme**.

La version 1.0.0 publiée reste la référence de production sur `main` jusqu’à la validation et à la publication de la V1.1.

## Fonctionnalités

- AKS Core et cycle de vie modulaire ;
- questionnaire santé public destiné aux licenciés mineurs ;
- décision administrative et attestation PDF FFKDA conditionnelle ;
- notifications du représentant légal et du club ;
- connecteur WordPress sécurisé ;
- Centre de pilotage administratif ;
- paramétrage centralisé ;
- journalisation structurée, conservation et consultation administrative ;
- fondations UX communes aux écrans d’administration.

## Organisation

- `src/core/` : services communs de la plateforme ;
- `src/app/` : contrôleurs et points d’entrée applicatifs ;
- `src/modules/` : modules métier ;
- `src/ui/` : interfaces partagées et administratives ;
- `src/tests/` : suites de validation Apps Script ;
- `integrations/wordpress/` : connecteur WordPress ;
- `docs/` : décisions d’architecture et documentation technique.

Le Project Book du dépôt `AKS-Platform-ProjectBook` constitue la référence fonctionnelle et documentaire officielle.

## Validation V1.1

Dans Apps Script, exécuter :

```text
AKS_runValidationSuiteV11
```

État validé avant préparation de la release : **121/121 tests réussis, 0 échec**.

La publication reste soumise au Quality Gate défini dans `RELEASE-001`.

## Branches

- `main` : version stable publiée ;
- `develop` : version en préparation ;
- branches dédiées : incréments isolés soumis par pull request vers `develop`.

## Déploiement

Le déploiement Apps Script et le connecteur WordPress doivent suivre les guides d’installation correspondant à la fonctionnalité concernée. Aucun déploiement de production ne doit être réalisé directement depuis une branche de travail.
