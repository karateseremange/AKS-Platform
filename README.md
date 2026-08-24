# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version publiée

La version stable applicative de référence est **AKS Platform V1.2.0**, publiée
le 28 juillet 2026.

- tag : `v1.2.0` ;
- commit : `47bb3ca83eb902bc9db0867c8d41affffd3ceb47` ;
- la production Apps Script historique reste sur la version 53 jusqu’au
  déploiement séparément autorisé de V1.4.0.

## Version 1.4.0 en finalisation

La branche `develop` prépare **AKS Platform 1.4.0 — ACCESS et administration
sécurisée**. Cette version stable est dérivée de la candidate
`1.4.0-rc.5` admise par le Quality Gate P4 au commit
`52024aba72a76247179bb801cfb93006151ebbb9`.

Elle n’est pas encore publiée sur `main`, taguée, déployée ni activée en
production.

- build stable embarqué : `20260824.1` ;
- périmètre principal : ACCESS, migration des fonctions administratives et AUDIT
  multi-environnement ;
- Présences est inclus dans l’écart cumulatif depuis `v1.2.0` ;
- les fondations Inscriptions 007 à 010 restent internes, sans route publiée ;
- la publication Git, le déploiement Apps Script, la configuration AUDIT et
  l’amorçage ACCESS restent des étapes distinctes.

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

La finalisation stable modifie uniquement les marqueurs et documents de version.
Elle doit être validée séparément avant toute publication sur `main`.

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
