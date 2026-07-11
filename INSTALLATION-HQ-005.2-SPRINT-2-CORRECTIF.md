# Installation — HQ-005.2 Sprint 2 Correctif

Depuis la racine du dépôt :

```powershell
Expand-Archive .\AKS-HQ005.2-Sprint2-Correctif-UX-Validation.zip -DestinationPath .\tmp-hq0052-s2-fix
Copy-Item .\tmp-hq0052-s2-fix\src\* .\src -Recurse -Force
Copy-Item .\tmp-hq0052-s2-fix\docs\* .\docs -Recurse -Force
Remove-Item .\tmp-hq0052-s2-fix -Recurse -Force

git diff --check
git diff --stat
clasp push
```

Créer ensuite une **nouvelle version** du déploiement Web App et sélectionner cette version dans le déploiement existant.

Tests :

```javascript
AKS_runHQ0052Sprint2Tests()
AKS_runHQ0052Sprint2FixTests()
```

Résultat attendu pour le correctif : `3 tests réussis sur 3`.
