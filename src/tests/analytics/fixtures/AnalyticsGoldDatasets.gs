var AKS = AKS || {};
AKS.Tests = AKS.Tests || {};

AKS.Tests.AnalyticsGoldDatasets = AKS.Analytics.GoldDatasetSupport.prepare([
  {
    id: "GOLD-001", title: "Jeu nominal", purpose: "Présences complètes et calculables.",
    input: {
      season: "2026-2027", courses: ["BABY"], statuses: ["PRESENT", "ABSENT", "EXCUSE"],
      attendances: [
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000002", status: "ABSENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000003", status: "EXCUSE" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000002", status: "NON_RENSEIGNE" }
      ]
    },
    expected: { outcome: "CALCULABLE", warnings: [] }
  },
  {
    id: "GOLD-002", title: "Éligibilité temporelle", purpose: "Entrée et sortie en cours de saison.",
    input: {
      memberId: "LIC-000002", entryDate: "2026-10-01", exitDate: "2027-03-31",
      checkNames: ["beforeEntry", "duringMembership", "afterExit"],
      checkDates: ["2026-09-30", "2026-12-01", "2027-04-01"],
      indicatorAttendances: [
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-30", licencie_id: "LIC-000002", status: "NON_ELIGIBLE" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-12-01", licencie_id: "LIC-000002", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2027-04-01", licencie_id: "LIC-000002", status: "NON_ELIGIBLE" }
      ]
    },
    expected: {
      eligibility: {
        beforeEntry: "NON_ELIGIBLE",
        duringMembership: "ELIGIBLE",
        afterExit: "NON_ELIGIBLE"
      }
    }
  },
  {
    id: "GOLD-003", title: "Données incomplètes", purpose: "Une cellule vide reste non renseignée.",
    input: {
      legacyValues: ["P", "", "E", "A"],
      indicatorAttendances: [
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000002", status: "NON_RENSEIGNE" }
      ]
    },
    expected: { normalized: ["PRESENT", "NON_RENSEIGNE", "EXCUSE", "ABSENT"], outcome: "PARTIEL" }
  },
  {
    id: "GOLD-004", title: "Séances annulées ou exclues", purpose: "Les séances non réalisées ne pénalisent personne.",
    input: {
      sessions: [
        { status: "REALISEE" },
        { status: "ANNULEE" },
        { status: "EXCLUE" }
      ],
      indicatorAttendances: [
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000001", status: "PRESENT", session_status: "ANNULEE" }
      ]
    },
    expected: { includedSessions: 1, excludedSessions: 2, exclusionCode: "SEANCE_NON_REALISEE" }
  },
  {
    id: "GOLD-005", title: "Doublons et conflits", purpose: "Distinguer doublon identique et contradiction.",
    input: {
      attendances: [
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000001", status: "ABSENT" }
      ]
    },
    expected: {
      accepted: 1,
      duplicatesNeutralized: 1,
      rejected: 2,
      state: "PARTIEL",
      anomalies: ["DOUBLON_IDENTIQUE", "DOUBLON_CONTRADICTOIRE"]
    }
  },
  {
    id: "GOLD-006", title: "Résultat partiel multi-cours", purpose: "Isoler l'échec d'un cours.",
    input: {
      courses: { BABY: "VALIDE", ENFANT_1: "ERREUR", ENFANT_2: "VALIDE", ADO_ADULTE: "VALIDE" },
      orchestration: {
        season: "2026-2027",
        expected_courses: ["BABY", "ENFANT_1", "ENFANT_2", "ADO_ADULTE"],
        courses: [
          { code: "BABY", attendances: [
            { session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" }
          ] },
          { code: "ENFANT_1", attendances: [
            { session_date: "2026-09-05", licencie_id: "LIC-000002", status: "INCONNU" }
          ] },
          { code: "ENFANT_2", attendances: [
            { session_date: "2026-09-05", licencie_id: "LIC-000003", status: "PRESENT" }
          ] },
          { code: "ADO_ADULTE", attendances: [
            { session_date: "2026-09-05", licencie_id: "LIC-000004", status: "PRESENT" }
          ] }
        ]
      },
      indicatorAttendances: [
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000001", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000002", status: "PRESENT" },
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000003", status: "ABSENT" }
      ]
    },
    expected: {
      publishedCourses: 3, failedCourses: ["ENFANT_1"], globalOutcome: "PARTIEL",
      restitution: { availableCourses: 3, unavailableCourses: ["ENFANT_1"], state: "PARTIEL" },
      reportContent: { reportCount: 5, globalState: "PARTIEL" },\n      chartModel: { chartCount: 5, globalState: "PARTIEL" }
    }
  },
  {
    id: "GOLD-007", title: "Identifiants", purpose: "Le licencie_id pilote Analytics ; le numéro fédéral reste facultatif.",
    input: {
      members: [
        { licencie_id: "LIC-000007", numero_licence: null },
        { licencie_id: "LIC-000008", numero_licence: "12345678" },
        { licencie_id: "LIC-000009", numero_licence: "12345678" }
      ]
    },
    expected: {
      acceptedMembers: 3,
      warnings: ["NUMERO_LICENCE_ABSENT"],
      duplicateLicenceError: "NUMERO_LICENCE_DUPLIQUE"
    }
  },
  {
    id: "GOLD-008", title: "Exclusion du cours féminin historique", purpose: "Exclure entièrement ce cours de 2025-2026.",
    input: {
      courses: [
        { season: "2025-2026", code: "BABY" },
        { season: "2025-2026", code: "FEMININ" }
      ]
    },
    expected: { includedCourses: ["BABY"], exclusions: ["FEMININ_HORS_PERIMETRE_HISTORIQUE"] }
  },
  {
    id: "GOLD-009", title: "Versions de schéma", purpose: "Refuser une version inconnue sans interprétation implicite.",
    input: { supportedVersion: "1.0", receivedVersion: "99.0" },
    expected: { acceptedVersion: "1.0", rejectedVersionError: "VERSION_SCHEMA_INCONNUE" }
  },
  {
    id: "GOLD-010", title: "Préparation de saison", purpose: "Une seconde exécution est non destructive et idempotente.",
    input: { season: "2026-2027", executions: 2, existingResources: true },
    expected: { duplicatesCreated: 0, resourcesOverwritten: 0, journalEntries: 2 }
  }
]);
