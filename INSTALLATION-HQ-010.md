# Installation HQ-010

## Prérequis

- AKS Platform RC 0.7.0 opérationnelle ;
- extension AKS Platform Connector 0.10.1 configurée ;
- page WordPress publique du questionnaire sauvegardée ;
- sauvegarde des fichiers et de la base WordPress réalisée.

## Mise à jour

1. Installer l'archive `aks-platform-connector-0.11.0.zip` en remplacement de la version existante.
2. Vérifier que l'extension **AKS Platform Connector** est active.
3. Dans Elementor, ouvrir la page `QuestionnaireMineur`.
4. Remplacer le shortcode existant par :

```text
[aks_health_questionnaire_page]
```

5. Utiliser une mise en page pleine largeur, sans barre latérale.
6. Masquer le titre WordPress de la page afin de conserver un seul titre principal.
7. Vider les caches WordPress, OVH et navigateur.
8. Exclure la page et `/wp-json/aks-platform/` de tout cache de page.

Le shortcode historique `[aks_health_questionnaire]` reste disponible pour revenir
immédiatement à l'affichage HQ-009.

## Navigation recommandée

Ajouter au menu principal une entrée **Inscriptions et démarches** pointant vers la
page du questionnaire. Éviter d'ouvrir le parcours dans une nouvelle fenêtre.

## Validation obligatoire

1. Exécuter `node integrations/wordpress/tests/connector-contract.test.js`.
2. Vérifier la page sur ordinateur et smartphone sans session WordPress ou Google.
3. Tester le bouton **Commencer le questionnaire**.
4. Réaliser un parcours complet de non-régression.
5. Vérifier les e-mails et l'absence de réponses détaillées dans WordPress.
