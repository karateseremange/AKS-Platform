# Installation — HQ-005.2 Sprint 4.1

Copier les répertoires `src` et `docs`, ainsi que les notes de version, à la racine du dépôt.

Contrôles :

```powershell
git diff --check
git diff --stat
clasp status
clasp push
```

Test Apps Script :

```javascript
AKS_runHQ0052Sprint41Tests()
```

Résultat attendu : 7 tests réussis sur 7.

Aucun nouveau déploiement Web App n’est nécessaire, car ce sprint ne modifie pas l’interface publique.
