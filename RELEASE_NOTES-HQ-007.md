# Release notes — HQ-007 Notifications par e-mail

## Contenu

- notification conditionnelle du représentant légal ;
- attestation FFKDA jointe uniquement lorsqu’aucun certificat médical n’est requis ;
- consignes sans PDF lorsqu’un certificat médical est requis ;
- notification administrative du club contenant l’identité du licencié, sa date de naissance, la référence et la formalité attendue ;
- horodatage indépendant des deux envois et reprise sans doublon ;
- passerelle Gmail/Drive injectable et tests automatisés dédiés.
- récapitulatif éphémère des questions et réponses envoyé uniquement au représentant légal.

## Confidentialité

Les réponses détaillées ne sont jamais enregistrées et sont envoyées uniquement au représentant légal pendant la soumission. Le message du club ne contient ni réponses détaillées, ni coordonnées du représentant légal, ni PDF, ni lien Drive.

## Validation

- 7/7 tests HQ-007 réussis ;
- 4/4 tests HQ-006 réussis ;
- 7/7 tests HQ-005.2 Sprint 4.3 réussis ;
- deux branches du workflow validées réellement dans Apps Script ;
- contenus, pièces jointes, destinataires et confidentialité contrôlés.
