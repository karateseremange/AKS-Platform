# HQ-006 — Génération de l’attestation PDF FFKDA

- génération automatique réservée au résultat `NO_MEDICAL_CERTIFICATE_REQUIRED` ;
- attestation FFKDA préremplie pour le représentant légal et le mineur ;
- zone Date et signature conservée vierge ;
- QR code discret contenant uniquement la référence opaque de soumission ;
- stockage dans un dossier Google Drive privé configuré ;
- passage de la soumission au statut `PDF_GENERATED` ;
- persistance de `attestationFileId` et `attestationFileUrl` ;
- aucune persistance des réponses détaillées ;
- 4 tests automatisés et validation réelle Apps Script réussis.
