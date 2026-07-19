# ADR-013 — Version de release embarquée

## Statut

Accepté pour AKS Platform v1.1.

## Contexte

AKS Platform doit exposer à l’exécution la version réellement déclarée par le code déployé. Le tag Git reste la référence officielle de la release publiée, mais Apps Script ne peut pas le lire à l’exécution.

Les versions de la plateforme, des modules et des intégrations sont distinctes. La version de plateforme ne doit pas être stockée dans `Script Properties`, afin qu’elle ne puisse pas être modifiée indépendamment du code déployé.

## Décision

La version de plateforme est déclarée une seule fois dans :

`src/core/release/PlatformVersion.gs`

La façade publique unique est :

`AKS.Version.getReleaseInfo()`

Le contrat minimal retourné est :

```javascript
{
  version: "1.1.0-dev",
  codename: "Consolidation"
}
```

`version` et `codename` relèvent de la release. `environment` relève de la configuration du déploiement et n’est pas inclus. `releaseDate` et `generatedAt` ne seront ajoutés que si leur production devient fiable et précisément définie.

Le cycle de prépublication utilise les suffixes `-dev`, puis éventuellement `-rc.n`, avant la version stable sans suffixe.

## Synchronisation avec Git

Lors d’une publication, la valeur embarquée est mise à jour avant la création du tag. Un contrôle automatisé doit vérifier que la version déclarée dans `PlatformVersion.gs` correspond exactement au tag Git attendu.

Ordre de publication :

1. mettre à jour la version embarquée ;
2. exécuter les tests ;
3. contrôler la cohérence avec la version de release attendue ;
4. fusionner sur `main` ;
5. créer le tag Git correspondant ;
6. déployer Apps Script.

## Conséquences

- Le tag Git reste la référence du processus de release.
- Le code déployé expose sa propre version déclarée sans dépendance externe.
- Le tableau de bord, les journaux, les API, les exports et les modules utilisent uniquement `AKS.Version.getReleaseInfo()`.
- La version de plateforme n’est ni une responsabilité du tableau de bord, ni une valeur de configuration modifiable.
- Les versions des modules et du connecteur WordPress restent indépendantes.
