# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version stable publiée

La référence Git stable publiée est **AKS Platform V1.4.1 — ACCESS et
administration sécurisée — correctif d’attribution**.

- tag léger immuable : `v1.4.1` ;
- snapshot applicatif tagué :
  `7e5125e759703fa7628cceae1b7545a3dfc597e6` ;
- intégration dans `develop` :
  `62c859a704d3879a105893ecfd38ba25935af393` ;
- build publié : `20260827.1`.

## Correctif V1.4.1 publié dans Git

Le correctif **V1.4.1 — ACCESS et administration sécurisée — correctif
d’attribution** est publié dans `main` et identifié par le tag léger
`v1.4.1`.

La publication Git ne constitue pas un déploiement Apps Script. La production
reste distincte et demeure sur V1.4.0.

## Statut de production

La production exécute toujours **AKS Platform V1.4.0** sur la version Apps
Script **54** du déploiement public existant `wgNc37`, dont l’identifiant et
l’URL sont préservés.

- AUDIT de production est configuré sur un support privé et validé ;
- ACCESS est amorcé avec deux gestionnaires actifs ;
- le Questionnaire santé public a été vérifié sans régression ;
- V1.4.1 est publiée et taguée dans Git, mais n’est pas déployée ;
- aucune attribution réelle de `CONFIG_*` ou `LOG_READ` n’est incluse dans
  la publication Git V1.4.1 ;
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

La candidate finale V1.4.1 exacte
`60cc727e531355accf51a4ccf3a63a348e3aad96` a été synchronisée dans le
projet Apps Script de recette suffixé `eIRxs4` :

- relecture post-push : **261/261 fichiers sans différence** ;
- VERSION-001 : **8/8 réussis** ;
- suite ciblée ACCESS : **15/15 réussis** ;
- campagne cumulative : **665/665 réussis** ;
- sauvegarde préalable vérifiée par SHA-256
  `D9EE0441F4149FE0503BD678F8B40820BE3554FB18BF4360F8D37CC831E49C6D` ;
- restauration de la recette : **261/261 fichiers sans différence** ;
- les deux déploiements de recette sont préservés et le suffixe de production
  `wgNc37` est absent.

La référence historique V1.4.0 reste le commit stable `5f16d907`, validé à
**8/8** VERSION-001 et **665/665** tests cumulés avant sa publication.

Ces résultats ont fondé l’intégration de V1.4.1 dans `develop`, sa
publication dans `main` au commit `7e5125e7` et la création du tag léger
`v1.4.1` sur ce même commit. Ils n’autorisent aucun déploiement de
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
