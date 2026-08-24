# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version Git publiée

La référence Git stable est **AKS Platform V1.4.0 — ACCESS et administration
sécurisée**, publiée le 24 août 2026.

- tag : `v1.4.0` ;
- commit `main` : `fa8876fcc57dcc46b943c8a3ce451e006bfa5bb5` ;
- build : `20260824.1` ;
- candidate admise : `1.4.0-rc.5` au commit
  `52024aba72a76247179bb801cfb93006151ebbb9`.

Le tag et le commit `main` ont été vérifiés comme strictement identiques.

## Statut de production

La publication Git V1.4.0 ne constitue pas un déploiement Apps Script.
La production historique reste sur la version Apps Script **53** et n'exécute
pas encore V1.4.0.

- aucun `clasp push` de production n'a été effectué ;
- aucune nouvelle version Apps Script ni modification du déploiement public
  n'a été réalisée ;
- AUDIT de production n'est pas configuré ;
- ACCESS n'est pas amorcé et aucun compte réel n'a reçu de capacité ;
- les fondations Inscriptions 007 à 010 restent internes, sans route publiée ;
- P6 et chaque opération de production exigent leurs autorisations propres.

## Fonctionnalités

- AKS Core et cycle de vie modulaire ;
- questionnaire santé public destiné aux licenciés mineurs ;
- décision administrative et attestation PDF FFKDA conditionnelle ;
- notifications du représentant légal et du club ;
- connecteur WordPress sécurisé ;
- Centre de pilotage administratif ;
- paramétrage centralisé ;
- journalisation structurée, conservation et consultation administrative ;
- fondations UX communes aux écrans d’administration ;
- AKS Analytics : contrôle des sources Google Sheets, consolidation, indicateurs,
  prévisualisation et publication de rapports PDF dans Google Drive ;
- gestion des rapports par saison et par cours, dont le cours féminin à partir de
  2026-2027 ;
- administration ACCESS des comptes, rôles et habilitations explicites ;
- Portail AKS, « Mes accès » et « Comptes et accès » ;
- socle AKS Inscriptions interne : jeux d’or fictifs et exécution déterministe
  sans route Web publiée.

## Organisation

- `src/core/` : services communs de la plateforme ;
- `src/app/` : contrôleurs et points d’entrée applicatifs ;
- `src/modules/` : modules métier ;
- `src/ui/` : interfaces partagées et administratives ;
- `src/tests/` : suites de validation Apps Script ;
- `integrations/wordpress/` : connecteur WordPress ;
- `docs/` : décisions d’architecture et documentation technique.

Le Project Book du dépôt `AKS-Platform-ProjectBook` constitue la référence fonctionnelle et documentaire officielle.

## Validation de référence

Dans Apps Script, exécuter :

```text
AKS_runValidationSuiteV11
```

La candidate RC5 exacte `52024ab` a réussi :

- VERSION-001 : **8/8** ;
- ACCESS administration : **15/15** ;
- campagne cumulative : **665/665**.

La finalisation stable exacte `5f16d907` a ensuite réussi **8/8**
VERSION-001 et **665/665** tests cumulés après synchronisation de **261
fichiers** en RECETTE. Elle a été intégrée dans `develop` à `32a511a`,
publiée dans `main` à `fa8876f` et taguée `v1.4.0`.

Ces validations et cette publication Git n'autorisent aucune opération de
production.

## Branches

- `main` : version stable publiée ;
- `develop` : version en préparation ;
- branches dédiées : incréments isolés soumis par pull request vers `develop`.

## Déploiement

Le déploiement Apps Script et le connecteur WordPress doivent suivre les guides
d’installation correspondant à la fonctionnalité concernée. Avant toute
publication Apps Script, le type du déploiement, son identifiant et ses paramètres
d’accès doivent être vérifiés. Aucun déploiement de production ne doit être réalisé
directement depuis une branche de travail.
