# Installation HQ-009.1

## 1. Apps Script

Créer un secret aléatoire d'au moins 32 caractères et l'enregistrer dans les
propriétés du script sous la clé `AKS_WORDPRESS_CONNECTOR_SECRET`.

Pousser ensuite les sources avec `clasp push`, créer une nouvelle version du
déploiement Web App existant et conserver son URL `/exec`.

## 2. WordPress

Installer l'archive de l'extension `aks-platform-connector`, sans encore
publier la page `QuestionnaireMineur`.

Ajouter avant la ligne de fin de `wp-config.php` :

```php
define('AKS_PLATFORM_API_URL', 'https://script.google.com/macros/s/DEPLOIEMENT/exec');
define('AKS_PLATFORM_CONNECTOR_SECRET', 'MEME_SECRET_QUE_DANS_APPS_SCRIPT');
```

Activer l'extension **AKS Platform Connector**.

## 3. Vérification

Exécuter `AKS_runHQ009Tests()` dans Apps Script. Le résultat attendu est
`{"ok":true,"feature":"HQ-009.1","passed":5,"total":5}`.

Ne jamais envoyer le secret par e-mail, le placer dans Git ou l'insérer dans
une page WordPress.
