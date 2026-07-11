# Release notes — HQ-004

## Modèle de soumission v2

Cette livraison remplace la soumission liée à un numéro de licencié par un dossier administratif autonome pour un mineur.

### Changements principaux

- suppression de `participantId`, `respondentType` et `answers` du modèle persisté ;
- nouveaux champs d’identité du mineur et du représentant légal ;
- nouveaux résultats administratifs explicites ;
- repository sans données médicales détaillées ;
- migration conservatrice de `HQ_Submissions` ;
- nouveaux tests HQ-004.

### Limite connue

La barre latérale historique contient encore l’ancien formulaire. Elle sera remplacée par l’interface publique lors du prochain incrément. Le domaine et le stockage HQ-004 sont prêts pour cette interface.
