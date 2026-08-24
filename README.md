# AKS Platform

Plateforme numérique officielle de l’Association Karaté Serémange.

## Version publiée

La version stable de production est **AKS Platform V1.2.0**, publiée le
28 juillet 2026.

- tag : `v1.2.0` ;
- commit : `47bb3ca83eb902bc9db0867c8d41affffd3ceb47` ;
- prochaine évolution applicative : candidate `1.4.0-rc.3` décrite ci-dessous.

## Candidate en préparation

La branche `develop` prépare **AKS Platform 1.4.0-rc.3**. Cette candidate n’est
ni publiée sur `main`, ni déployée, ni activée en production.

- base validée avant préparation : `8ae1b0c7b6a8f1225a70beb3fe3456a7b8b46792` ;
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

RC1 `b13fc20` a été validée à **661/661** puis RC2 `8ae1b0c` à **662/662**
après correction de la destination « Mes accès » en phase de bootstrap. RC3
valide le type entier de la conservation AUDIT par le service de configuration
réel ; la prochaine campagne attend **63/63** pour AUDIT et **663/663** cumulés.

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
