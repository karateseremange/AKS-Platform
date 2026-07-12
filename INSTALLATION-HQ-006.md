# Installation HQ-006

1. Créer dans Google Drive un dossier privé pour les attestations.
2. Ouvrir **Paramètres du projet > Propriétés du script** dans Apps Script.
3. Ajouter `AKS_HEALTH_QUESTIONNAIRE_ATTESTATION_FOLDER_ID` avec l’identifiant du dossier.
4. Synchroniser les sources avec `clasp push`.
5. Exécuter `AKS_runHQ006Tests()` : 4 tests doivent réussir.
6. Redéployer la Web App avec la nouvelle version.
7. Effectuer une soumission de validation dont toutes les réponses sont négatives.
8. Vérifier le PDF, son QR code et les champs `status`, `attestationFileId` et `attestationFileUrl` dans `HQ_Submissions`.
