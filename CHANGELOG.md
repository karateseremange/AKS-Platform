# Changelog

## HQ-007 — Notifications par e-mail

- Ajout des notifications conditionnelles du représentant légal.
- Envoi du PDF FFKDA uniquement lorsqu’aucun certificat médical n’est requis.
- Ajout de la notification administrative du club avec identité du licencié, date de naissance, référence et formalité attendue.
- Persistance indépendante des deux horodatages d’envoi.
- Ajout de 7 tests automatisés HQ-007.
- Formalisation des messages adressés au représentant légal et ajout du rappel de confidentialité.
- Envoi éphémère du récapitulatif des questions et réponses uniquement au représentant légal, sans persistance.

## HQ-006 — 2026-07-12
- Génération de l’attestation PDF officielle FFKDA.
- Préremplissage des identités du représentant légal et du mineur.
- Stockage Drive privé et suivi dans `HQ_Submissions`.
- QR code de vérification sans donnée personnelle ou médicale.

## 0.1.0
- Initial structure.
