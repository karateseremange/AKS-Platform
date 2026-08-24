# Changelog

## 1.4.0-rc.3 — ACCESS et administration sécurisée — Candidate non publiée

### ACCESS

- administration des comptes, rôles et habilitations explicites ;
- portail privé et consultation « Mes accès » ;
- migration d’Analytics, Paramétrage et Journaux vers les capacités ACCESS ;
- compatibilité de lecture des registres antérieurs et normalisation interne sans
  réécriture automatique ;
- procédures de recette et de récupération réversibles.

### AUDIT

- audit persistant commun pour `RECETTE` et `PRODUCTION` avec supports distincts ;
- liaison obligatoire au projet Apps Script et contrôle des permissions ;
- précontrôle sans écriture séparé du test contrôlé d’écriture/relecture ;
- conservation initiale déclarée à 1 095 jours, sans purge introduite.

### Administration et Analytics

- contrôles serveur fins pour Analytics, Paramétrage et Journaux ;
- visibilité et actions adaptées aux capacités explicitement attribuées ;
- maintien du Questionnaire santé comme service public, sans destination privée.

### Contenu cumulatif

- évolutions de saisie des Présences intégrées depuis `v1.2.0` ;
- fondations INSCRIPTIONS-007 à INSCRIPTIONS-010 conservées internes et non
  exposées par le routeur Web ;
- fuseau Apps Script aligné sur `Europe/Paris`.

### Validation et limites

- base préalable validée à **62/62** pour AUDIT et **660/660** cumulés ;
- RC1 validée à **661/661**, RC2 à **662/662** et RC3 attendue à **663/663** ;
- aucune publication sur `main`, aucun tag, aucun déploiement et aucune opération
  de production réalisés à ce stade ;
- numéro stable et build final à confirmer après Quality Gate et inventaire du
  déploiement public réel.

## 1.2.0 — AKS Analytics — Publiée le 28 juillet 2026

- consolidation et indicateurs par saison et par cours ;
- prévisualisation et publication contrôlée des rapports ;
- saisie des Présences et contrôles serveur intégrés après le tag `v1.2.0` ;
- tag de publication : `v1.2.0` au commit `47bb3ca`.

La V1.3.0 est une publication documentaire et opérationnelle AKS Calendar sans
modification du code Apps Script ; la version applicative sous-jacente reste
V1.2.0.

## 1.1.0 — Consolidation de la plateforme — Publiée le 19 juillet 2026

### Administration

- Ajout du Centre de pilotage comme point d’entrée administratif.
- Ajout d’une navigation déclarative et d’un contrôle d’accès Google côté serveur.
- Ajout des contrats `DashboardProvider` et `DashboardWidget`.
- Isolation des widgets afin qu’une défaillance locale ne bloque pas le tableau de bord.

### Paramétrage

- Ajout d’un registre central des paramètres et de leur résolution.
- Ajout de la persistance et de l’écriture contrôlée.
- Ajout de l’interface d’administration du paramétrage.
- Ajout de retours accessibles et de la prévention des doubles soumissions.

### Journalisation

- Ajout d’événements structurés et de fournisseurs de journalisation isolés.
- Ajout de la persistance durable dans `AKS_Logs`.
- Ajout d’une conservation à 90 jours et d’une purge contrôlée par lots.
- Ajout d’une consultation administrative en lecture seule avec filtres.

### Expérience utilisateur

- Ajout d’un socle CSS commun aux écrans administratifs.
- Harmonisation du focus clavier, des zones d’action et des états désactivés.
- Ajout d’états filtrés, d’un résumé des résultats et d’une réinitialisation des filtres.
- Présentation des dates au format français et des niveaux d’événement avec des libellés compréhensibles.

### Architecture et qualité

- Ajout d’une API de métadonnées de version embarquées.
- Préservation du Questionnaire santé V1.0 et du parcours public par défaut.
- Ajout de la suite de validation Apps Script V1.1.
- État validé avant préparation de la release : **121/121 tests réussis, 0 échec**.

## ADMIN-001 — Tableau de bord d’administration — 2026-07-19

- Ajout du premier incrément du Dashboard administratif.
- Ajout du contrôle d’autorisation Google côté serveur.
- Affichage de la version et du nom de code depuis `AKS.Version`.
- Ajout de la carte « Actions rapides » avec état vide explicite.
- Ajout du routage `?app=admin` sans modification du comportement public par défaut.
- Ajout de 4 tests automatisés ADMIN-001.

## HQ-010 — Intégration WordPress professionnelle — 2026-07-15

- Ajout du shortcode `[aks_health_questionnaire_page]` pour une page publique complète.
- Ajout d'une introduction, des étapes de préparation et du rappel de confidentialité.
- Ajout d'un accès direct au formulaire et des coordonnées d'assistance du club.
- Conservation du shortcode HQ-009 et de l'ensemble du contrat sécurisé existant.
- Ajout des contrôles de structure, d'accessibilité et d'affichage mobile.

## HQ-009.2 — Interface WordPress — 2026-07-13

- Ajout du shortcode `[aks_health_questionnaire]`.
- Ajout du parcours responsive complet sur le domaine du club.
- Conservation des garanties de date de naissance HQ-008.
- Ajout de la limitation technique des appels et de 14 contrôles automatisés.
- Ajout de la validation progressive et des messages précis pour chaque champ.
- Validation réelle des deux formalités, du mode visiteur et de la page publique.

## HQ-009.1 — Connecteur WordPress sécurisé — 2026-07-13

- Ajout d'une API Apps Script signée HMAC-SHA256.
- Ajout des contrôles d'expiration, de rejeu et de taille des requêtes.
- Réutilisation du contrôleur et du workflow de soumission existants.
- Ajout de l'extension WordPress sans stockage des réponses.
- Compatibilité avec la redirection de restitution ContentService Apps Script.
- Ajout de 5 tests automatisés HQ-009.1.

## HQ-008 — Saisie mobile de la date de naissance — 2026-07-13

- Remplacement du calendrier natif par deux champs numériques jour/année et une liste des mois.
- Conservation du format ISO transmis au serveur.
- Validation des dates impossibles et maintien du calcul de l’âge.
- Ajout d’un rappel de vérification des courriers indésirables sur la page finale.
- Ajout de 3 tests automatisés HQ-008.

## HQ-007 — Notifications par e-mail — 2026-07-13

- Ajout des notifications conditionnelles du représentant légal.
- Envoi du PDF FFKDA uniquement lorsqu’aucun certificat médical n’est requis.
- Ajout de la notification administrative du club avec identité du licencié, date de naissance, référence et formalité attendue.
- Persistance indépendante des deux horodatages d’envoi.
- Ajout de 7 tests automatisés HQ-007.
- Formalisation des messages adressés au représentant légal et ajout du rappel de confidentialité.
- Envoi éphémère du récapitulatif des questions et réponses uniquement au représentant légal, sans persistance.

## HQ-006 — 2026-07-12
- Génération de l’attestation PDF officielle FFKDA.
- Préremplissage des identités du représentant légal et du mineur.
- Stockage Drive privé et suivi dans `HQ_Submissions`.
- QR code de vérification sans donnée personnelle ou médicale.

## 0.1.0
- Initial structure.
