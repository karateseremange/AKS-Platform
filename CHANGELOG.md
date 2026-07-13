# Changelog

## HQ-009.1 — Connecteur WordPress sécurisé — 2026-07-13

- Ajout d'une API Apps Script signée HMAC-SHA256.
- Ajout des contrôles d'expiration, de rejeu et de taille des requêtes.
- Réutilisation du contrôleur et du workflow de soumission existants.
- Ajout de l'extension WordPress sans stockage des réponses.
- Compatibilité avec la redirection de restitution ContentService Apps Script.
- Ajout de 5 tests automatisés HQ-009.1.

## HQ-008 — Saisie mobile de la date de naissance — 2026-07-13

- Remplacement du calendrier natif par deux champs numériques jour/année et une liste des mois.
- Conservation du format ISO transmis au serveur.
- Validation des dates impossibles et maintien du calcul de l’âge.
- Ajout d’un rappel de vérification des courriers indésirables sur la page finale.
- Ajout de 3 tests automatisés HQ-008.

## HQ-007 — Notifications par e-mail — 2026-07-13

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
