# Installation HQ-007

1. Dans le compte Google qui exécute la Web App, ajouter et valider `contact@karate-seremange.fr` comme adresse d’envoi (« Envoyer des e-mails en tant que »).
2. Vérifier que l’adresse est soit l’adresse principale du compte exécutant, soit présente dans `GmailApp.getAliases()`.
3. Conserver la configuration Drive de HQ-006.
4. Synchroniser les sources avec `clasp push`.
5. Exécuter `AKS_runHQ007Tests()` : 7 tests doivent réussir.
6. Réexécuter `AKS_runHQ006Tests()` : 4 tests doivent réussir.
7. Réexécuter `AKS_runHQ0052Sprint43Tests()` pour vérifier le workflow antérieur.
8. Redéployer la Web App avec une nouvelle version.
9. Soumettre un questionnaire entièrement négatif : vérifier le PDF joint au représentant et, côté club, l’identité du licencié, sa date de naissance, la référence et l’absence de certificat requis.
10. Soumettre un questionnaire comportant au moins une réponse positive : vérifier les consignes sans PDF et, côté club, la mention « Certificat médical requis » sans pièce jointe.
11. Dans `HQ_Submissions`, vérifier `respondentEmailSentAt`, `clubEmailSentAt` et le statut `COMPLETED`.
