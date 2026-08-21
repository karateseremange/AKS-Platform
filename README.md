# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version publiée

La version stable de production est **AKS Platform V1.2.0**, publiée le
28 juillet 2026.

- tag : `v1.2.0` ;
- commit : `47bb3ca83eb902bc9db0867c8d41affffd3ceb47` ;
- prochaine évolution applicative : candidate `1.4.0-rc.1` décrite ci-dessous.

## Candidate en préparation

La branche `develop` prépare **AKS Platform 1.4.0-rc.1**. Cette candidate n’est
ni publiée sur `main`, ni déployée, ni activée en production.

- base validée avant préparation : `ab52dc6200ca5e138883d182cfcd700352276dad` ;
- périmètre principal : ACCESS, migration des fonctions administratives et AUDIT
  multi-environnement ;
- Présences est inclus dans l’écart cumulatif depuis `v1.2.0` ;
- les fondations Inscriptions 007 à 010 restent internes, sans route publiée ;
- la version stable et le build définitif restent soumis au Quality Gate et au
  rapprochement du déploiement public réel.

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
- socle AKS Inscriptions : jeux d’or fictifs et exécution déterministe sans
  écriture réelle.

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

La base `ab52dc6` a été validée dans l’environnement Apps Script de recette à
**62/62** pour AUDIT et **660/660** pour la campagne cumulative. La candidate
ajoute un contrôle de cohérence de version ; la prochaine campagne attend donc
**8/8** pour VERSION-001 et **661/661** cumulés.

La publication reste soumise au Quality Gate défini dans `RELEASE-001`.

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
