# Installation HQ-004

1. Copier les dossiers `src` et `docs` ainsi que `RELEASE_NOTES-HQ-004.md` dans le dépôt.
2. Vérifier avec `git diff --check` et `git diff`.
3. Exécuter `clasp push`.
4. Dans Apps Script, exécuter `AKS_install()` : l’ancienne feuille `HQ_Submissions` est sauvegardée automatiquement si son schéma est obsolète.
5. Exécuter les suites :
   - `AKS_runF001Tests()`
   - `AKS_runF002Tests()`
   - `AKS_runHQ001Tests()`
   - `AKS_runHQ002Tests()`
   - `AKS_runHQ003Tests()`
   - `AKS_runHQ004Tests()`
