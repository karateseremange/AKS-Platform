=== AKS Platform Connector ===
Contributors: karateseremange
Requires at least: 6.6
Requires PHP: 8.1
Stable tag: 0.10.1
License: GPLv2 or later

Passerelle serveur à serveur sécurisée pour AKS Platform.

== Description ==

Cette extension expose les routes WordPress nécessaires au questionnaire AKS.
Elle ne crée aucune table et ne conserve aucune réponse au questionnaire.

La configuration est fournie par les constantes AKS_PLATFORM_API_URL et
AKS_PLATFORM_CONNECTOR_SECRET dans wp-config.php.

Le shortcode `[aks_health_questionnaire]` affiche le parcours public complet.

== Changelog ==

= 0.10.1 =
* Validation progressive et messages précis sur l'étape d'identité.
* Boutons activés uniquement lorsque chaque étape est complète.

= 0.10.0 =
* Ajout du shortcode et de l'interface responsive du questionnaire.
* Ajout de la limitation des appels sans stockage de données métier.

= 0.9.1 =
* Prise en charge sécurisée de la redirection ContentService Apps Script.
