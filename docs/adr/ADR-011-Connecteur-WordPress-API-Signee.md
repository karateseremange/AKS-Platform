# ADR-011 — Connecteur WordPress et API signée

## Statut

Accepté pour HQ-009.

## Contexte

La Web App Apps Script publique fonctionne en navigation privée, mais une
session Google multiple peut empêcher son ouverture. Le questionnaire doit
être intégré au site du club sans compromettre la confidentialité des réponses.

## Décision

WordPress utilise une extension dédiée comme passerelle serveur à serveur.
Chaque requête vers Apps Script contient une version, une action, un horodatage,
un nonce aléatoire, une charge JSON conservée sous forme de chaîne et une
signature HMAC-SHA256.

La signature couvre le condensat exact de la charge. Apps Script vérifie la
signature, une fenêtre de cinq minutes et l'absence de rejeu avant de décoder
la charge métier.

Le secret partagé est conservé uniquement dans `wp-config.php` et dans les
propriétés du script Apps Script. Le navigateur ne le reçoit jamais.

WordPress ne crée aucune table et ne journalise ni ne place en cache les
réponses. Les routes publiques exigent un nonce REST WordPress et vérifient
l'origine lorsqu'elle est fournie.

## Conséquences

- Le parcours reste sur le domaine du club et ne dépend plus de la session Google.
- Les actions API réutilisent le contrôleur et le workflow existants.
- Le lien Apps Script direct reste disponible comme solution de secours.
- La compromission du secret impose sa rotation dans les deux configurations.
- L'interface publique WordPress est livrée séparément dans HQ-009.2.
