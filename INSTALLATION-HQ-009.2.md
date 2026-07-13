# Installation HQ-009.2

## Prérequis

- HQ-009.1 configuré et test réel `context` / `prepare` réussi ;
- extension AKS Platform Connector 0.9.1 active ;
- page `QuestionnaireMineur` conservée en brouillon.

## Mise à jour

Téléverser l'archive `aks-platform-connector-0.10.1.zip` depuis l'ajout
d'extensions WordPress, puis remplacer la version installée.

Dans Elementor, ajouter un widget **Code court** contenant uniquement :

```text
[aks_health_questionnaire]
```

Mettre à jour la page sans la publier et utiliser son aperçu pour les essais.

## Tests obligatoires

1. Exécuter `node integrations/wordpress/tests/connector-contract.test.js`.
2. Vérifier l'affichage ordinateur et Android.
3. Tester une date impossible, un mineur et une date correspondant à un majeur.
4. Tester un parcours sans certificat, puis un parcours avec certificat.
5. Vérifier les e-mails, les pièces jointes et la notification du club.
6. Vérifier qu'aucune réponse détaillée n'apparaît dans WordPress.

La page ne doit être publiée qu'après validation complète.
