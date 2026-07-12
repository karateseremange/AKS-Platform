# HQ-006 — Génération de l’attestation PDF FFKDA

## Statut

Validé dans Apps Script le 12 juillet 2026.

## Source documentaire

Le rendu reprend l’attestation mineur FFKDA conservée dans le dépôt documentaire sous `references/ffkda/2-Attestation mineur.pdf`. Le logo officiel provient de `references/ffkda/LOGO-FFKarate_H_RVB.png`.

## Règles

- génération réservée au résultat `NO_MEDICAL_CERTIFICATE_REQUIRED` ;
- préremplissage du représentant légal et du licencié mineur ;
- zone Date et signature laissée vierge ;
- référence de soumission visible en pied de page ;
- QR code limité au format opaque `AKS-QS|1|<référence>` ;
- image QR produite côté serveur par l’API QuickChart à partir de cette seule référence opaque ;
- URL HTTPS utilisée directement dans le modèle HTML afin d’être rendue lors de la conversion PDF Apps Script ;
- aucune réponse, information médicale ou identité dans le QR code ;
- stockage privé dans un dossier Drive configuré ;
- persistance de l’identifiant et de l’URL Drive dans `HQ_Submissions` ;
- statut final `PDF_GENERATED`.

## Configuration

Créer un dossier Drive privé destiné aux attestations, puis ajouter son identifiant aux propriétés du script :

```text
AKS_HEALTH_QUESTIONNAIRE_ATTESTATION_FOLDER_ID=<identifiant du dossier>
```

Le compte exécutant la Web App doit disposer du droit de création dans ce dossier.

## Confidentialité

Le générateur reçoit exclusivement un objet `Submission`. Les réponses détaillées restent hors du modèle, du PDF, de Drive et du QR code.

## Validation

Exécuter `AKS_runHQ006Tests()`, puis réaliser une soumission entièrement négative dans la Web App. Vérifier le PDF créé dans Drive ainsi que la mise à jour de `HQ_Submissions`.

Validation réalisée :

- 4 tests automatisés réussis ;
- génération réelle du PDF dans Drive ;
- préremplissage des identités vérifié ;
- QR code visible, lisible et limité à la référence opaque ;
- statut `PDF_GENERATED` et références Drive persistés ;
- absence de réponses détaillées confirmée.
