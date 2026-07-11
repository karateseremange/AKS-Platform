# Installation

Depuis la racine du dépôt `AKS-Platform` :

```powershell
Expand-Archive .\AKS-HQ003-campaign-creation.zip -DestinationPath .\tmp-hq003-create
Copy-Item .\tmp-hq003-create\src\* .\src -Recurse -Force
Copy-Item .\tmp-hq003-create\docs\* .\docs -Recurse -Force
Remove-Item .\tmp-hq003-create -Recurse -Force

git diff --check
git diff
clasp status
clasp push
```

Dans Apps Script, exécuter :

```javascript
AKS_runHQ002Tests()
AKS_runHQ003Tests()
```

Résultat attendu pour HQ-003 : `8 tests réussis sur 8`.

Rechargez ensuite le classeur et utilisez :

`AKS Platform > Créer une campagne santé`
