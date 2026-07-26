var AKS = AKS || {};
AKS.Tests = AKS.Tests || {};

AKS.Tests.AnalyticsGoldDatasets = AKS.Analytics.GoldDatasetSupport.prepare([
  {
    id: "GOLD-001", title: "Jeu nominal", purpose: "Présences complètes et calculables.",
    input: { season: "2026-2027", courses: ["BABY"], statuses: ["PRESENT", "ABSENT", "EXCUSE"] },
    expected: { outcome: "CALCULABLE", warnings: [] }
  },
  {
    id: "GOLD-002", title: "Éligibilité temporelle", purpose: "Entrée et sortie en cours de saison.",
    input: { memberId: "LIC-000002", entryDate: "2026-10-01", exitDate: "2027-03-31" },
    expected: { beforeEntry: "NON_ELIGIBLE", duringMembership: "ELIGIBLE", afterExit: "NON_ELIGIBLE" }
  },
  {
    id: "GOLD-003", title: "Données incomplètes", purpose: "Une cellule vide reste non renseignée.",
    input: { legacyValues: ["P", "", "E", "A"] },
    expected: { normalized: ["PRESENT", "NON_RENSEIGNE", "EXCUSE", "ABSENT"], outcome: "PARTIEL" }
  },
  {
    id: "GOLD-004", title: "Séances annulées ou exclues", purpose: "Les séances non réalisées ne pénalisent personne.",
    input: { sessions: ["REALISEE", "ANNULEE", "EXCLUE"] },
    expected: { includedSessions: 1, excludedSessions: 2 }
  },
  {
    id: "GOLD-005", title: "Doublons et conflits", purpose: "Distinguer doublon identique et contradiction.",
    input: { duplicateKinds: ["IDENTIQUE", "CONTRADICTOIRE"] },
    expected: { accepted: 1, rejected: 1, anomalies: ["DOUBLON_CONTRADICTOIRE"] }
  },
  {
    id: "GOLD-006", title: "Résultat partiel multi-cours", purpose: "Isoler l'échec d'un cours.",
    input: { courses: { BABY: "VALIDE", ENFANT_1: "ERREUR", ENFANT_2: "VALIDE", ADO_ADULTE: "VALIDE" } },
    expected: { publishedCourses: 3, failedCourses: ["ENFANT_1"], globalOutcome: "PARTIEL" }
  },
  {
    id: "GOLD-007", title: "Identifiants", purpose: "Le licencie_id pilote Analytics ; le numéro fédéral reste facultatif.",
    input: { memberId: "LIC-000007", licenceNumber: null, duplicatedLicenceNumber: "12345678" },
    expected: { memberAccepted: true, warnings: ["NUMERO_LICENCE_ABSENT"], errors: ["NUMERO_LICENCE_DUPLIQUE"] }
  },
  {
    id: "GOLD-008", title: "Exclusion du cours féminin historique", purpose: "Exclure entièrement ce cours de 2025-2026.",
    input: { season: "2025-2026", courses: ["BABY", "FEMININ"] },
    expected: { includedCourses: ["BABY"], exclusions: ["FEMININ_HORS_PERIMETRE_HISTORIQUE"] }
  },
  {
    id: "GOLD-009", title: "Versions de schéma", purpose: "Refuser une version inconnue sans interprétation implicite.",
    input: { supportedVersion: "1.0", receivedVersion: "99.0" },
    expected: { outcome: "REJETE", errors: ["VERSION_SCHEMA_INCONNUE"] }
  },
  {
    id: "GOLD-010", title: "Préparation de saison", purpose: "Une seconde exécution est non destructive et idempotente.",
    input: { season: "2026-2027", executions: 2, existingResources: true },
    expected: { duplicatesCreated: 0, resourcesOverwritten: 0, journalEntries: 2 }
  }
]);
