# Release notes — HQ-007 Notifications par e-mail

## Contenu

- notification conditionnelle du représentant légal ;
- attestation FFKDA jointe uniquement lorsqu’aucun certificat médical n’est requis ;
- consignes sans PDF lorsqu’un certificat médical est requis ;
- notification administrative du club limitée à la référence ;
- horodatage indépendant des deux envois et reprise sans doublon ;
- passerelle Gmail/Drive injectable et tests automatisés dédiés.

## Confidentialité

Les réponses détaillées ne sont ni enregistrées, ni envoyées. Le message du club ne contient ni identité, ni décision, ni PDF, ni lien Drive.

## Validation attendue

- 7 tests HQ-007 ;
- non-régression HQ-006 et HQ-005.2 Sprint 4.3 ;
- validation réelle des deux branches du workflow dans Apps Script.
