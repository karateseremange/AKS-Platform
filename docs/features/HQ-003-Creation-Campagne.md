# HQ-003 — Création d'une campagne santé

## Statut

En cours de validation.

## Comportement livré

- Ajout de l'entrée de menu `Créer une campagne santé`.
- Saisie contrôlée de la saison au format `AAAA-AAAA`.
- Nom facultatif avec valeur par défaut `Campagne santé <saison>`.
- Génération automatique de l'identifiant technique.
- Enregistrement de la définition de questionnaire disponible dans le module.
- Création de la campagne avec le statut `OPEN`.
- Activation automatique de la campagne créée.
- Refus d'une deuxième campagne possédant le même identifiant de saison.

## Limite connue

La définition de questionnaire actuellement enregistrée reste une définition technique provisoire. Le contenu officiel des questions devra être intégré dans un incrément distinct avant ouverture aux licenciés.
