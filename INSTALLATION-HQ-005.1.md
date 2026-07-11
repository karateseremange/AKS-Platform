# Installation HQ-005.1

Copier le contenu du paquet à la racine du dépôt, puis exécuter :

```powershell
git diff --check
git diff --stat
clasp status
clasp push
```

Dans Apps Script :

```javascript
AKS_runHQ0051Tests()
```

Résultat attendu : `5/5`.

Créer ensuite un déploiement Web App de test :

- Exécuter en tant que : vous-même ;
- Utilisateurs ayant accès : toute personne disposant du lien.

Ouvrir l'URL `/exec` du déploiement.
