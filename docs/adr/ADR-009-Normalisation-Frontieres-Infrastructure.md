# ADR-009 — Normalisation aux frontières de l’infrastructure

## Statut

Accepté.

## Décision

Toute valeur provenant d’un système externe, notamment Google Sheets, doit être normalisée dans la couche infrastructure avant d’entrer dans le domaine.

Exemples :

- date Sheets → chaîne ISO attendue par le domaine ;
- cellule vide → `null` ;
- valeur booléenne → `Boolean` explicite ;
- nombre → `Number` validé.

## Conséquence

Le domaine reste indépendant des conversions automatiques et des types spécifiques à Google Sheets.
