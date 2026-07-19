# ADR-012 — Authentification Google de l’administration

## Statut

Accepté pour ADMIN-001 et AKS Platform v1.1.

## Contexte

AKS Platform distingue l’application publique, qui doit rester accessible sans
compte Google, de l’application d’administration, réservée à un nombre limité
d’utilisateurs autorisés.

Développer une authentification propre à AKS Platform imposerait la gestion des
comptes, mots de passe, sessions, expirations et procédures de récupération,
sans valeur ajoutée suffisante pour la V1.1.

Une Web App Apps Script temporaire a donc été utilisée pour vérifier le
comportement réel de `Session.getActiveUser()` et de
`Session.getEffectiveUser()` dans `doGet()` et dans un appel
`google.script.run`.

## Décision

L’application d’administration est une Web App distincte de l’application
publique et utilise l’authentification Google native.

Son déploiement Apps Script utilise les paramètres suivants :

- exécuter en tant que : **Utilisateur accédant à l’application Web** ;
- accès : **utilisateurs authentifiés par Google**.

L’authentification Google ne constitue pas à elle seule une autorisation.
Chaque fonction serveur administrative contrôle l’adresse retournée par
`Session.getActiveUser().getEmail()` avant tout accès aux données ou tout
traitement métier.

La liste des administrateurs autorisés est centralisée dans `Config.gs`, sous
`CONFIG.ADMIN.AUTHORIZED_EMAILS`. Pour ADMIN-001 V1.1, cette configuration est :

- embarquée dans le code ;
- versionnée dans Git ;
- immuable à l’exécution ;
- modifiable uniquement par modification du code, revue et redéploiement.

Elle ne constitue donc pas une configuration administrable dynamiquement.
Une éventuelle migration vers les propriétés du script ou vers un futur
service de paramétrage sécurisé fera l’objet d’une décision ultérieure.

Les adresses sont normalisées avant comparaison. Une configuration absente,
invalide ou vide entraîne un refus d’accès. Le contrôle reste exclusivement
côté serveur.

La décision d’autorisation est exclusivement prise côté serveur. Le client ne
peut ni accorder ni contourner cette autorisation.

`Session.getEffectiveUser()` peut être utilisé à des fins de diagnostic, mais
ne constitue jamais la source de décision d’autorisation.

## Validation

Les essais réalisés le 19 juillet 2026 ont confirmé les comportements suivants :

- le compte autorisé `karate.seremange@gmail.com` est identifié dans `doGet()`
  et dans l’appel serveur, puis accepté ;
- le compte connecté non autorisé `aserridj@gmail.com` est identifié dans les
  deux contextes, puis refusé avec le code `ADMIN001_ACCESS_DENIED` ;
- sans compte Google connecté, Google bloque l’accès avant l’exécution de la
  Web App administrative ;
- lorsque la Web App est exécutée en tant qu’utilisateur accédant,
  `ActiveUser` et `EffectiveUser` correspondent au compte connecté dans les
  essais effectués ;
- une liste d’administrateurs vide ou invalide provoque un refus fermé ;
- l’application publique ne lit pas la configuration administrative et ne
  dépend pas du contrôle d’autorisation d’ADMIN-001.

## Conséquences

- Aucun système de comptes ou de mots de passe AKS n’est développé pour la
  V1.1.
- Tout administrateur doit disposer d’un compte Google.
- Être authentifié par Google ne suffit pas : l’utilisateur doit également
  figurer dans la configuration serveur des administrateurs autorisés.
- Ajouter ou retirer un administrateur nécessite une modification versionnée
  de `Config.gs` puis un nouveau déploiement Apps Script.
- Toutes les fonctions serveur administratives sont protégées par défaut.
- Aucune donnée administrative ne doit être exposée avant la validation de
  l’autorisation côté serveur.
- L’application publique et le questionnaire santé restent accessibles sans
  compte Google et ne sont pas modifiés par cette décision.
