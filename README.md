# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version publiée

La version stable de production est **AKS Platform V1.2.0**, publiée le
28 juillet 2026.

- tag : `v1.2.0` ;
- commit : `47bb3ca83eb902bc9db0867c8d41affffd3ceb47` ;
- prochaine évolution applicative : candidate `1.4.0-rc.2` décrite ci-dessous.

## Candidate en préparation

La branche `develop` prépare **AKS Platform 1.4.0-rc.2**. Cette candidate n’est
ni publiée sur `main`, ni déployée, ni activée en production.

- base validée avant préparation : `b13fc202300af6f7ce0c99b65403fa83117ed34b` ;
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

La candidate RC1 `b13fc20` a été validée dans l’environnement Apps Script de
recette à **8/8** pour VERSION-001, **62/62** pour AUDIT et **661/661** pour la
campagne cumulative. RC2 corrige la destination « Mes accès » en phase de
bootstrap et porte la prochaine campagne cumulative attendue à **662/662**.

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
