# Installation — RC 0.3.0 — HQ-005.2 Sprint 2

Depuis la racine du dépôt :

```powershell
Expand-Archive .\AKS-HQ005.2-Sprint2-Validation-Intelligente.zip -DestinationPath .\tmp-hq0052-s2
Copy-Item .\tmp-hq0052-s2\src\* .\src -Recurse -Force
Copy-Item .\tmp-hq0052-s2\docs\* .\docs -Recurse -Force
Copy-Item .\tmp-hq0052-s2\RELEASE_NOTES-HQ-005.2-SPRINT-2.md . -Force
Copy-Item .\tmp-hq0052-s2\INSTALLATION-HQ-005.2-SPRINT-2.md . -Force
Remove-Item .\tmp-hq0052-s2 -Recurse -Force
```

Contrôles :

```powershell
git diff --check
git diff --stat
git diff
clasp status
clasp push
```

Tests Apps Script :

```javascript
AKS_runHQ0051Tests()
AKS_runHQ0052Sprint1Tests()
AKS_runHQ0052Sprint2Tests()
```

Puis exécuter les suites F-001 à HQ-004 pour la non-régression.

Créer une nouvelle version du déploiement Web App et tester l'URL `/exec`.
