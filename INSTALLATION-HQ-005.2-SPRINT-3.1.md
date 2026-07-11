# Installation — HQ-005.2 Sprint 3.1

Depuis la racine du dépôt :

```powershell
Expand-Archive .\AKS-HQ005.2-Sprint3.1-Conformite-Annexe-II-23.zip -DestinationPath .\tmp-hq0052-s31
Copy-Item .\tmp-hq0052-s31\src\* .\src -Recurse -Force
Copy-Item .\tmp-hq0052-s31\docs\* .\docs -Recurse -Force
Copy-Item .\tmp-hq0052-s31\RELEASE_NOTES-HQ-005.2-SPRINT-3.1.md . -Force
Copy-Item .\tmp-hq0052-s31\INSTALLATION-HQ-005.2-SPRINT-3.1.md . -Force
Remove-Item .\tmp-hq0052-s31 -Recurse -Force
```

Contrôles :

```powershell
git diff --check
git diff --stat
clasp status
clasp push
```

Dans Apps Script, exécuter dans cet ordre :

```javascript
AKS_upgradeHQ0052Sprint31()
AKS_runHQ0052Sprint31Tests()
```

Le résultat de la migration doit indiquer 24 questions.

Créer ensuite une nouvelle version du déploiement Web App et l'affecter au déploiement existant.
