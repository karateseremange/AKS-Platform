# AKS Platform — Formulaires

## Validation

- Une validation légère est exécutée pendant la saisie.
- Une validation complète est exécutée au changement et à la sortie du champ.
- Le bouton principal reste désactivé tant que l'étape n'est pas valide.
- Une tentative invalide affiche un résumé et place le focus sur le premier champ concerné.

## Messages

Les messages décrivent l'action attendue :

- « Veuillez saisir une adresse e-mail valide. »
- « Veuillez renseigner la date de naissance. »
- « Ce questionnaire est réservé aux sportifs mineurs. »

Les messages techniques et génériques sont interdits dans l'interface publique.

## Date de naissance

L'âge n'est jamais demandé manuellement. Il est calculé à partir de la date de naissance et affiché à l'utilisateur.
