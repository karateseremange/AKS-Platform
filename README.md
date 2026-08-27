# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version stable publiée

La référence Git stable publiée reste **AKS Platform V1.4.0 — ACCESS et
administration sécurisée**.

- tag immuable : `v1.4.0` ;
- snapshot applicatif tagué :
  `fa8876fcc57dcc46b943c8a3ce451e006bfa5bb5` ;
- tête `main` actuelle :
  `7a6b70a341bc869f10e1a18efda8ad4d6ab8fe6d`, avancée uniquement par une
  correction documentaire post-release ;
- build publié : `20260824.1`.

## Correctif V1.4.1 en préparation

Le correctif **V1.4.1 — ACCESS et administration sécurisée — correctif
d’attribution** est préparé depuis `develop`.

- intégration ACCESS-002-07 dans `develop` :
  `6d7815a2f3e20256de4c55c361670c7fd3fdaddb` ;
- version préparée : `1.4.1` ;
- build préparé : `20260827.1` ;
- branche de finalisation : `release/v1.4.1-finalization`.

Cette préparation ne constitue ni une publication dans `main`, ni un tag, ni
un déploiement Apps Script.

## Statut de production

La production exécute toujours **AKS Platform V1.4.0** sur la version Apps
Script **54** du déploiement public existant `wgNc37`, dont l’identifiant et
l’URL sont préservés.

- AUDIT de production est configuré sur un support privé et validé ;
- ACCESS est amorcé avec deux gestionnaires actifs ;
- le Questionnaire santé public a été vérifié sans régression ;
- V1.4.1 n’est ni publiée ni déployée ;
- aucune attribution réelle de `CONFIG_*` ou `LOG_READ` n’est incluse dans
  la préparation V1.4.1 ;
- les fondations Inscriptions 007 à 010 restent internes, sans route publiée ;
- l’implémentation d’INSCRIPTIONS-011 n’est pas engagée.

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

ACCESS-002-07 a été validé sur la candidate exacte `c2efda48` dans le projet
Apps Script de recette :

- relecture : **261/261 fichiers sans différence** ;
- suite ciblée ACCESS : **15/15 réussis** ;
- campagne cumulative : **665/665 réussis** ;
- restauration de la recette : **261/261 fichiers sans différence**.

Ces résultats couvrent le correctif fonctionnel avant l’actualisation des
métadonnées de version. La candidate finale V1.4.1 devra être synchronisée et
recettée séparément, après autorisation explicite, notamment avec
VERSION-001 et la campagne cumulative.

La référence historique V1.4.0 reste le commit stable `5f16d907`, validé à
**8/8** VERSION-001 et **665/665** tests cumulés avant sa publication.

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
