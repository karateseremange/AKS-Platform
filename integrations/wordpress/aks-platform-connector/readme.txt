=== AKS Platform Connector ===
Contributors: karateseremange
Requires at least: 6.6
Requires PHP: 8.1
Stable tag: 0.9.1
License: GPLv2 or later

Passerelle serveur à serveur sécurisée pour AKS Platform.

== Description ==

Cette extension expose les routes WordPress nécessaires au questionnaire AKS.
Elle ne crée aucune table et ne conserve aucune réponse au questionnaire.

La configuration est fournie par les constantes AKS_PLATFORM_API_URL et
AKS_PLATFORM_CONNECTOR_SECRET dans wp-config.php.

HQ-009.1 installe la passerelle. L'interface publique et le shortcode seront
livrés dans HQ-009.2.

== Changelog ==

= 0.9.1 =
* Prise en charge sécurisée de la redirection ContentService Apps Script.
