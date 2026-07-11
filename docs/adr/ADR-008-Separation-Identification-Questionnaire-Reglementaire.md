# ADR-008 — Séparation entre identification et questionnaire réglementaire

## Statut
Accepté.

## Contexte
AKS Platform doit identifier le sportif et son représentant légal pour générer les documents et envoyer les notifications. Ces informations administratives ne font pas partie de l'annexe II-23.

## Décision
Le parcours distingue :

1. **Identification**, propre à AKS Platform ;
2. **Questionnaire officiel**, reproduisant l'annexe II-23.

L'âge et le sexe sont saisis une seule fois dans Identification, puis affichés en lecture seule dans le questionnaire officiel.

## Conséquences
- les données administratives peuvent être conservées selon le modèle HQ-004 ;
- les réponses médicales restent éphémères ;
- la définition réglementaire est centralisée et versionnée ;
- une évolution réglementaire pourra être intégrée sans refaire l'interface d'identification.
