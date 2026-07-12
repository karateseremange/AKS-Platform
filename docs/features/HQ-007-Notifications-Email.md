# HQ-007 — Notifications par e-mail

## Statut

Livrable candidat à la validation Apps Script.

## Règles

- expéditeur : `Association Karaté Serémange` ;
- adresse d’envoi et de réponse : `contact@karate-seremange.fr` ;
- résultat `NO_MEDICAL_CERTIFICATE_REQUIRED` : le représentant légal reçoit l’attestation FFKDA en pièce jointe ;
- résultat `MEDICAL_CERTIFICATE_REQUIRED` : le représentant légal reçoit les consignes sans pièce jointe ;
- le club reçoit uniquement une notification administrative contenant la référence ;
- le club ne reçoit ni identité, ni résultat, ni PDF, ni lien Drive ;
- aucune réponse détaillée ne franchit la frontière du service de notification.

## Workflow

1. la soumission administrative est enregistrée ;
2. HQ-006 génère le PDF lorsque le résultat le permet ;
3. le représentant légal est notifié et `respondentEmailSentAt` est persisté ;
4. le club est notifié et `clubEmailSentAt` est persisté ;
5. la soumission passe au statut `COMPLETED`.

Chaque envoi réussi est persisté immédiatement. Une reprise avec la même soumission ignore les destinataires déjà notifiés.

## Infrastructure

La passerelle utilise `GmailApp.sendEmail`. L’adresse du club doit être déclarée comme alias d’envoi du compte qui exécute la Web App. La pièce jointe est chargée depuis Drive uniquement pour le message admissible du représentant légal.

## Validation

Exécuter `AKS_runHQ007Tests()` puis les suites HQ-005.2 Sprint 4.3 et HQ-006. Effectuer ensuite deux soumissions réelles, une pour chaque décision administrative, et contrôler destinataires, contenus, pièces jointes et horodatages.
