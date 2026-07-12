# HQ-007 — Notifications par e-mail

## Statut

Validé dans Apps Script le 13 juillet 2026.

## Règles

- expéditeur : `Association Karaté Serémange` ;
- adresse d’envoi et de réponse : `contact@karate-seremange.fr` ;
- résultat `NO_MEDICAL_CERTIFICATE_REQUIRED` : le représentant légal reçoit l’attestation FFKDA en pièce jointe ;
- résultat `MEDICAL_CERTIFICATE_REQUIRED` : le représentant légal reçoit les consignes sans pièce jointe ;
- le club reçoit le nom, le prénom et la date de naissance du licencié mineur, la référence et la formalité attendue ;
- le club ne reçoit ni coordonnées du représentant légal, ni réponses détaillées, ni PDF, ni lien Drive ;
- aucune réponse détaillée ne franchit la frontière du service de notification.

Les réponses détaillées constituent une exception éphémère limitée au message du représentant légal : le contrôleur construit un récapitulatif temporaire avec chaque question et sa réponse, le transmet au service de notification pendant la soumission, puis l’abandonne. Ce récapitulatif n’entre jamais dans `Submission`, le repository, Google Sheets, Drive, le PDF, les journaux ou le message du club.

Les messages adressés au représentant légal utilisent une formulation institutionnelle, rappellent la confidentialité des réponses et précisent la formalité nécessaire pour finaliser le dossier d’inscription.

## Workflow

1. la soumission administrative est enregistrée ;
2. HQ-006 génère le PDF lorsque le résultat le permet ;
3. le représentant légal est notifié et `respondentEmailSentAt` est persisté ;
4. le club est notifié de l’identité administrative du licencié et de la formalité attendue, puis `clubEmailSentAt` est persisté ;
5. la soumission passe au statut `COMPLETED`.

Chaque envoi réussi est persisté immédiatement. Une reprise avec la même soumission ignore les destinataires déjà notifiés.

## Infrastructure

La passerelle utilise `GmailApp.sendEmail`. L’adresse du club doit être déclarée comme alias d’envoi du compte qui exécute la Web App. La pièce jointe est chargée depuis Drive uniquement pour le message admissible du représentant légal.

## Validation

Exécuter `AKS_runHQ007Tests()` puis les suites HQ-005.2 Sprint 4.3 et HQ-006. Effectuer ensuite deux soumissions réelles, une pour chaque décision administrative, et contrôler destinataires, contenus, pièces jointes et horodatages.

Validation réalisée :

- 7 tests automatisés HQ-007 réussis ;
- 4 tests de non-régression HQ-006 réussis ;
- 7 tests de non-régression HQ-005.2 Sprint 4.3 réussis ;
- scénario sans certificat médical validé avec attestation PDF et récapitulatif détaillé côté représentant ;
- scénario avec certificat médical validé sans PDF et avec récapitulatif détaillé côté représentant ;
- notification administrative du club validée dans les deux scénarios ;
- absence des réponses détaillées dans le message du club et les données persistées confirmée ;
- expédition réelle depuis `contact@karate-seremange.fr` sous le nom `Association Karaté Serémange` validée.
