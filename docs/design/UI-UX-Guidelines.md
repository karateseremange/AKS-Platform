# AKS Platform — UI/UX Guidelines v1

## Principes

- **Simplicité** : une action principale par écran.
- **Confiance** : expliquer l'usage et la confidentialité des données.
- **Progression** : toujours indiquer l'étape active.
- **Réversibilité** : permettre le retour sans perdre les données.
- **Retour visible** : aucun clic ne doit rester sans réaction.

## Couleurs

- Bleu AKS `#2A4B9B` : action, sélection, étape active et focus.
- Gris : états neutres et inactifs.
- Rouge sombre : messages et bordures d'erreur uniquement.
- Les réponses Oui et Non utilisent le même traitement visuel neutre.

## Accessibilité

- L'information ne repose jamais uniquement sur la couleur.
- Les messages d'erreur sont associés aux champs avec `aria-describedby`.
- Les messages dynamiques utilisent `aria-live`.
- Les cibles tactiles ont une hauteur minimale de 44 px.
- Le focus clavier reste visible.
