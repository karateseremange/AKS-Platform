# HQ-008 — Saisie mobile de la date de naissance

## Statut

Validé dans Apps Script le 13 juillet 2026.

## Contexte

Le calendrier natif associé à `input type="date"` oblige l’utilisateur mobile à parcourir de nombreux mois pour renseigner une date de naissance. Son rendu varie également entre Android, iOS et les navigateurs.

## Décision

La date de naissance est saisie avec trois champs explicites dans l’ordre français : jour, mois et année.

- le jour est saisi avec le clavier numérique et limité à deux chiffres ;
- les mois sont affichés en français ;
- l’année est saisie avec le clavier numérique et limitée à quatre chiffres ;
- la date complète est validée afin de rejeter les combinaisons impossibles ;
- la valeur transmise au serveur conserve le contrat ISO `AAAA-MM-JJ` ;
- l’âge calculé reste affiché immédiatement.

La page finale informe également le représentant légal qu’un e-mail récapitulatif a été envoyé et l’invite à vérifier les courriers indésirables.

## Impact

Le changement est limité à la couche Web. Le domaine, `Submission`, les repositories, Google Sheets, le PDF et les notifications ne changent pas.

## Validation

Exécuter `AKS_runHQ008Tests()`, puis les suites HQ-005.2 Sprint 2 et HQ-007. Valider visuellement la saisie sur Android, iOS et ordinateur.

Validation réalisée :

- 3/3 tests HQ-008 réussis ;
- 5/5 tests de non-régression HQ-005.2 Sprint 2 réussis ;
- 7/7 tests de non-régression HQ-007 réussis ;
- saisie numérique jour et année validée sur Android et ordinateur ;
- sélection du mois, calcul de l’âge et soumission complète validés ;
- message final relatif à l’e-mail et aux courriers indésirables validé ;
- compatibilité technique iOS assurée par les contrôles HTML natifs, à confirmer lors d’un prochain test sur appareil.
