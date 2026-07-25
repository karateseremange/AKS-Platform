# AKS Platform 1.1.0 — Notes de publication

## Statut

**Release en préparation — non publiée.**

La branche `main` et la production restent sur la version stable 1.0.0 jusqu’à validation complète du Quality Gate V1.1.

## Objectif

La version 1.1.0 consolide le socle d’AKS Platform avant l’arrivée du module AKS Analytics. Elle n’ajoute aucun nouveau module métier et ne modifie pas les règles du Questionnaire santé.

## Principales évolutions

- Centre de pilotage administratif extensible ;
- navigation et contrôle d’accès administratifs ;
- paramétrage centralisé avec interface dédiée ;
- journalisation structurée, persistante et consultable ;
- conservation des journaux à 90 jours et purge contrôlée ;
- fondations UX communes et accessibles ;
- présentation compréhensible des états, résultats et événements ;
- métadonnées de version embarquées.

## Compatibilité

- Le Questionnaire santé public reste disponible sans compte WordPress ou Google.
- Le comportement public par défaut est conservé.
- Les réponses détaillées au questionnaire ne sont toujours pas stockées.
- Le connecteur WordPress existant reste dans le périmètre de non-régression.
- Aucune dépendance envers l’environnement Proxmox personnel n’est introduite.

## Validation acquise

- Suite Apps Script V1.1 : **121/121 tests réussis, 0 échec**.
- Incréments ADMIN, CONFIG, LOG et UX validés séparément puis fusionnés dans `develop`.
- Aucun changement V1.1 n’est encore fusionné dans `main`.

## Contrôles restant nécessaires avant publication

- régulariser la clôture documentaire d’`ARCH-002` ;
- exécuter le contrôle de cohérence final du Project Book ;
- confirmer la non-régression fonctionnelle du Questionnaire santé et du connecteur WordPress ;
- confirmer l’absence de défaut bloquant ou critique ;
- synchroniser les versions finales du code et de la documentation ;
- faire valider la fusion de `develop` vers `main` dans les deux dépôts ;
- créer les tags de publication conformément à `RELEASE-001`.

## Procédure de validation automatisée

Dans Apps Script :

```text
AKS_runValidationSuiteV11
```

Résultat attendu :

```text
RÉSULTAT: 121/121 réussis, 0 échec(s).
```

## Décision de publication

Ces notes ne constituent pas une autorisation de publication. La fusion dans `main`, le déploiement de production et la création des tags nécessitent la validation explicite du Product Owner après satisfaction de tous les contrôles ci-dessus.
