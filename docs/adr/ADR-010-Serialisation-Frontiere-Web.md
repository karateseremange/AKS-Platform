# ADR-010 — Sérialisation à la frontière Web

## Décision
Toute donnée renvoyée au navigateur par `google.script.run` doit être un payload composé uniquement de chaînes, nombres, booléens, valeurs nulles, tableaux et objets JavaScript simples.

Les `Date`, `Blob`, objets Apps Script et instances métier doivent être convertis avant de quitter le contrôleur Web.

## Application
Le DTO de confirmation contient uniquement `submissionId`, `result`, `status` et `submittedAt` au format ISO.
