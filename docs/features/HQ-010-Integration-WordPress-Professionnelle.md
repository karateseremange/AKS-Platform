# HQ-010 — Intégration WordPress professionnelle

## Objectif

Présenter le questionnaire mineur comme une démarche officielle du club, claire et
rassurante, avant l'ouverture du formulaire sécurisé HQ-009.

## Parcours

Le shortcode `[aks_health_questionnaire_page]` affiche :

1. une introduction identifiant le club et l'objectif de la démarche ;
2. un bouton menant directement au questionnaire ;
3. trois consignes de préparation ;
4. l'engagement de confidentialité ;
5. le questionnaire existant ;
6. l'adresse d'assistance du club.

## Compatibilité

Le shortcode `[aks_health_questionnaire]` reste inchangé et utilisable. La page
professionnelle appelle ce même composant : elle ne duplique pas le workflow.

Les styles sont limités aux espaces `.aks-entry` et `.aks-hq`. La cible reste
WordPress 7, PHP 8.3, OceanWP et Elementor.

## Confidentialité

- aucun stockage WordPress supplémentaire ;
- aucun traceur ou service tiers ajouté ;
- aucune réponse détaillée visible par le club ;
- contrat REST signé HQ-009 inchangé.

## Référencement et exploitation

La page d'explication peut être référencée par les moteurs de recherche. Le cache de
page doit en revanche être désactivé sur le parcours et sur les routes REST AKS afin
d'éviter la réutilisation d'un nonce expiré.
