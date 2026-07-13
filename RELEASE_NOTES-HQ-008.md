# Release notes — HQ-008 Saisie mobile de la date de naissance

## Contenu

- remplacement du calendrier natif par deux champs numériques jour/année et une liste des mois ;
- mois présentés en français ;
- années limitées à la période utile aux licenciés mineurs ;
- validation des dates impossibles ;
- maintien du calcul immédiat de l’âge ;
- conservation du contrat ISO `AAAA-MM-JJ` avec le serveur.
- ajout d’un rappel sur la page finale concernant l’e-mail récapitulatif et les courriers indésirables.

## Compatibilité

Aucun changement n’est apporté au domaine, à `Submission`, aux repositories, à Google Sheets, au PDF ou aux notifications.

## Validation attendue

- 3 tests HQ-008 ;
- non-régression HQ-005.2 Sprint 2 et HQ-007 ;
- validation visuelle sur Android, iOS et ordinateur.
