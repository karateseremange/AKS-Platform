# Notes de livraison — HQ-009.1

## Contenu

- point d'entrée JSON `doPost` ;
- authentification HMAC-SHA256 et comparaison en temps constant ;
- expiration à cinq minutes et protection anti-rejeu atomique ;
- routage vers le contrôleur existant ;
- extension WordPress sans stockage métier ;
- protection des routes navigateur par nonce REST et contrôle d'origine ;
- suivi en GET de la redirection ContentService, limité au domaine Google autorisé ;
- cinq tests de contrat et de sécurité.

## Compatibilité

Le point d'entrée HTML `doGet` et le parcours Apps Script RC 0.6.0 restent
inchangés. L'extension requiert PHP 8.1 ou supérieur ; la cible validée utilise
PHP 8.3.23.

## Suite

HQ-009.2 ajoutera le shortcode, l'interface responsive et la validation réelle
de bout en bout avant publication de la page WordPress.
