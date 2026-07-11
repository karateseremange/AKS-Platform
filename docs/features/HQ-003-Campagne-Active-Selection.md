# HQ-003 — Sélection de la campagne active

## Statut

En cours de validation.

## Objectif

Permettre à l'administrateur de sélectionner une campagne existante sans connaître ni saisir son identifiant technique.

## Comportement

- Les campagnes enregistrées dans `HQ_Campaigns` sont chargées par le repository.
- Elles sont triées par saison décroissante puis par nom.
- Le menu affiche une liste numérotée avec le nom, la saison et le statut.
- La campagne actuellement active est signalée.
- L'administrateur saisit uniquement le numéro de la campagne.
- L'identifiant technique reste géré en interne.
- Si aucune campagne n'existe, un message explicite est affiché.

## Hors périmètre de cet incrément

- Création d'une campagne depuis l'interface.
- Modification ou suppression d'une campagne.
- Ouverture et fermeture d'une campagne.

## Tests

Exécuter :

```javascript
AKS_runHQ002Tests()
AKS_runHQ003Tests()
```

Puis valider visuellement le menu :

`AKS Platform > Sélectionner la campagne active`
