# HQ-005.2 Sprint 4.2 — Correctif contrôleur

## Correction

Le contrôleur implémentait `prepareDeclaration` et `validateDeclaration`, mais ne les exposait pas dans l'objet retourné. Les tests recevaient donc `undefined`.

Les deux méthodes sont désormais exportées sans modification de leur comportement.
