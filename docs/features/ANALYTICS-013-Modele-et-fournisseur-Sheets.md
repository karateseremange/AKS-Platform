# ANALYTICS-013 — Modèle officiel et fournisseur Google Sheets

## Objet

Ce livrable définit la source de données officielle d’AKS Analytics et son
adaptateur Google Sheets en lecture seule.

Un classeur distinct est utilisé pour chacun des cours `BABY`, `ENFANT_1`,
`ENFANT_2` et `ADO_ADULTE`. Les quatre classeurs partagent strictement la même
structure. Le cours féminin reste hors périmètre pour la saison 2025-2026.

## Feuilles obligatoires

### `Configuration`

| Clé | Valeur |
|---|---|
| `saison` | `2026-2027` |
| `code_cours` | `BABY`, `ENFANT_1`, `ENFANT_2` ou `ADO_ADULTE` |
| `version_modele` | `1.0` |

### `Licenciés`

Colonnes obligatoires :

| ID licencié | Numéro licence FFK | Nom | Prénom | Date entrée | Date sortie |
|---|---|---|---|---|---|

`ID licencié` est la clé stable au format `LIC-xxxxxx`. Le numéro de licence
FFK est facultatif. Les dates sont saisies au format date et exportées sous la
forme `AAAA-MM-JJ`.

### `Séances`

Colonnes obligatoires :

| ID séance | Date séance | État |
|---|---|---|

États autorisés : `REALISEE`, `ANNULEE`, `EXCLUE`.

### `Présences`

Colonnes obligatoires :

| Saison | Cours | Date séance | ID licencié | Statut |
|---|---|---|---|---|

Statuts autorisés : `PRESENT`, `ABSENT`, `EXCUSE`, `NON_RENSEIGNE`,
`NON_ELIGIBLE`. Une cellule de statut vide est lue comme `NON_RENSEIGNE` et
jamais comme une absence.

### `Contrôle`

Feuille destinée aux contrôles visibles : identifiants absents ou dupliqués,
séances sans présence, présences orphelines et couverture des saisies. Elle
n’est pas une source métier du fournisseur.

### `Tableau de bord`

Feuille de restitution à destination des professeurs. Elle n’est pas une source
métier du fournisseur et peut évoluer sans modifier le contrat Analytics.

## Paramètres CONFIG-001

Les classeurs sont identifiés exclusivement par leurs IDs :

- `analytics.sheets.babySpreadsheetId`
- `analytics.sheets.enfant1SpreadsheetId`
- `analytics.sheets.enfant2SpreadsheetId`
- `analytics.sheets.adoAdulteSpreadsheetId`

## Garanties du fournisseur

- lecture seule via `SpreadsheetApp.openById` ;
- aucun accès par nom de fichier ;
- validation de la saison, du code cours et de la version du modèle ;
- diagnostic isolé par cours ;
- absence d’écriture ou de correction implicite dans les sources ;
- exclusion des séances annulées ou exclues ;
- sortie directement compatible avec `AKS.Analytics.CourseOrchestrator` ;
- aucune donnée nominative dans la journalisation.

## Import historique 2025-2026

L’import des quatre fichiers historiques fera l’objet d’une opération séparée :

- les fichiers sources resteront inchangés ;
- les dates de janvier à mai seront corrigées vers 2026 dans les copies
  importées ;
- les cellules vides deviendront `NON_RENSEIGNE` ;
- les anomalies seront présentées avant validation ;
- aucune absence ne sera déduite d’une cellule vide ;
- le cours féminin restera exclu.

## Validation Apps Script

Suite centrale attendue :

```text
AKS_runValidationSuiteV11
RÉSULTAT: 250/250 réussis, 0 échec(s).
```

Test d’intégration en lecture seule :

```text
AKS_runAnalyticsSheetsIntegrationSuite
RÉSULTAT: 1/1 réussis, 0 échec(s).
```

Les propriétés de test requises sont :

- `ANALYTICS_SHEETS_TEST_SEASON`
- `ANALYTICS_SHEETS_TEST_BABY_ID`
- `ANALYTICS_SHEETS_TEST_ENFANT_1_ID`
- `ANALYTICS_SHEETS_TEST_ENFANT_2_ID`
- `ANALYTICS_SHEETS_TEST_ADO_ADULTE_ID`
