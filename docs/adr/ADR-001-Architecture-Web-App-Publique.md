# ADR-001 — Architecture de la Web App publique

## Statut

Accepté.

## Contexte

La Web App doit évoluer vers un parcours comprenant information, identité, questionnaire, déclaration et confirmation, tout en restant maintenable dans Apps Script.

## Décision

La Web App utilise :

- un contrôleur qui expose uniquement un modèle de présentation ;
- un shell HTML unique ;
- des pages et composants HTML évalués côté serveur ;
- un fichier CSS isolé ;
- un moteur JavaScript générique piloté par une description de flux.

Le HTML public n’accède jamais directement au repository ni aux paramètres.

## Conséquences

Les étapes futures peuvent être ajoutées sans recopier le layout, la progression ou la navigation. Cette architecture n’introduit aucun framework externe.
