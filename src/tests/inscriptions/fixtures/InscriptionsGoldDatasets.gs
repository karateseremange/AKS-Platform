var AKS = AKS || {};
AKS.Tests = AKS.Tests || {};

AKS.Tests.InscriptionsGoldDatasetsRaw = [
  {
    id: "INS-GOLD-001", version: "1.0", title: "Import nominal Karaté", operation: "ADAPT_FORM",
    input: { source: "KARATE", row: { "Nom": " Durand ", "Prénom": "Élise", "Date de naissance": "2014-03-02", "Adresse e-mail": "famille@example.test" } },
    expected: { status: "REUSSI", output: { source: "KARATE", lastName: "DURAND", firstName: "ELISE", birthDate: "2014-03-02", email: "FAMILLE@EXAMPLE.TEST", synthesis: "ABSENT" } },
    fingerprint: "ba3ddeab"
  },
  {
    id: "INS-GOLD-002", version: "1.0", title: "Formulaire féminin incomplet par contrat", operation: "ADAPT_FORM",
    input: { source: "FEMININ", row: { "Nom": "Martin", "Prénom": "Anne", "Adresse e-mail": "anne@example.test" } },
    expected: { status: "REUSSI", output: { source: "FEMININ", lastName: "MARTIN", firstName: "ANNE", birthDate: "ABSENT", email: "ANNE@EXAMPLE.TEST", synthesis: "ABSENT" } },
    fingerprint: "1fc0ee3d"
  },
  {
    id: "INS-GOLD-003", version: "1.0", title: "Body Karaté synthétique", operation: "ADAPT_FORM",
    input: { source: "BODY_KARATE", row: { "Nom": "Petit", "Prénom": "Lina", "Date de naissance": "1990-08-12", "Adresse e-mail": "lina@example.test", "Réponse synthétique": "oui" } },
    expected: { status: "REUSSI", output: { source: "BODY_KARATE", lastName: "PETIT", firstName: "LINA", birthDate: "1990-08-12", email: "LINA@EXAMPLE.TEST", synthesis: "OUI" } },
    fingerprint: "98dbedfd"
  },
  {
    id: "INS-GOLD-004", version: "1.0", title: "Valeurs absentes et invalides", operation: "NORMALIZE_ANSWERS",
    input: { values: [null, "", "non", "Oui", "peut-être"] },
    expected: { status: "REUSSI", output: ["ABSENT", "ABSENT", "NON", "OUI", "INVALIDE"] },
    fingerprint: "9472aeba"
  },
  {
    id: "INS-GOLD-005", version: "1.0", title: "Rapprochement certain", operation: "MATCH",
    input: { subject: { lastName: "Durand", firstName: "Élise", birthDate: "2014-03-02", email: "famille@example.test" }, candidates: [{ id: "LIC-000001", lastName: "DURAND", firstName: "ELISE", birthDate: "2014-03-02", email: "famille@example.test" }] },
    expected: { status: "REUSSI", output: { decision: "CERTAIN", ids: ["LIC-000001"] } },
    fingerprint: "c6c58a65"
  },
  {
    id: "INS-GOLD-006", version: "1.0", title: "Rapprochement probable", operation: "MATCH",
    input: { subject: { lastName: "Durand", firstName: "Élise", birthDate: "2014-03-02", email: "nouveau@example.test" }, candidates: [{ id: "LIC-000001", lastName: "DURAND", firstName: "ELISE", birthDate: "2014-03-02", email: "ancien@example.test" }] },
    expected: { status: "REUSSI", output: { decision: "PROBABLE", ids: ["LIC-000001"] } },
    fingerprint: "4db3b586"
  },
  {
    id: "INS-GOLD-007", version: "1.0", title: "Rapprochements ambigu et absent", operation: "MATCH",
    input: { subject: { lastName: "Martin", firstName: "Léo", birthDate: "2012-09-01", email: "x@example.test" }, candidates: [{ id: "LIC-000003", lastName: "MARTIN", firstName: "LEO", birthDate: "2012-09-01", email: "a@example.test" }, { id: "LIC-000002", lastName: "MARTIN", firstName: "LEO", birthDate: "2012-09-01", email: "b@example.test" }] },
    expected: { status: "REUSSI", output: { decision: "AMBIGU", ids: ["LIC-000002", "LIC-000003"] } },
    fingerprint: "f0c23cbd"
  },
  {
    id: "INS-GOLD-008", version: "1.0", title: "Allocation des identifiants", operation: "ALLOCATE",
    input: { counters: {}, requests: [{ type: "LIC" }, { type: "RSP" }, { type: "INS", year: "2026" }, { type: "IMP", year: "2026", importType: "FORMS" }, { type: "IMP", year: "2026", importType: "SIKADA" }] },
    expected: { status: "REUSSI", output: { ids: ["LIC-000001", "RSP-000001", "INS-2026-000001", "IMP-2026-000001", "IMP-2026-000001"], counters: { "LIC|GLOBAL|GLOBAL": 1, "RSP|GLOBAL|GLOBAL": 1, "INS|2026|GLOBAL": 1, "IMP|2026|FORMS": 1, "IMP|2026|SIKADA": 1 } } },
    fingerprint: "e3ff2106"
  },
  {
    id: "INS-GOLD-009", version: "1.0", title: "Idempotence durable simulée", operation: "IDEMPOTENCY",
    input: { commands: [{ key: "REQ-1", payload: { value: 1 } }, { key: "REQ-1", payload: { value: 1 } }, { key: "REQ-1", payload: { value: 2 } }] },
    expected: { status: "REUSSI", output: { outcomes: ["APPLIQUEE", "REJOUEE", "CONFLIT"], uniqueCommands: 1 } },
    fingerprint: "bef9f0e7"
  },
  {
    id: "INS-GOLD-010", version: "1.0", title: "Transitions de lot", operation: "TRANSITIONS",
    input: { initial: "RECUE", targets: ["VALIDEE", "A_EVALUER", "VALIDEE", "REJETEE"] },
    expected: { status: "REUSSI", output: { finalState: "VALIDEE", accepted: [false, true, true, false] } },
    fingerprint: "95c89a7b"
  },
  {
    id: "INS-GOLD-011", version: "1.0", title: "Contrôle d'accès à compléter", operation: "DECLARED_PARTIAL",
    input: { output: { verified: ["REFUS_AVANT_DEPOT"], missing: ["INSCRIPTIONS_READ", "INSCRIPTIONS_WRITE"] } },
    expected: { status: "PARTIEL", output: { verified: ["REFUS_AVANT_DEPOT"], missing: ["INSCRIPTIONS_READ", "INSCRIPTIONS_WRITE"] } },
    fingerprint: "85be4af9"
  },
  {
    id: "INS-GOLD-012", version: "1.0", title: "Échec de l'audit obligatoire", operation: "DEPENDENCY_FAILURE",
    input: { auditAvailable: false },
    expected: { status: "REUSSI", output: { committed: false, reported: "AUDIT_REQUIRED" } },
    fingerprint: "ef2bd9ff"
  },
  {
    id: "INS-GOLD-013", version: "1.0", title: "Fixture SIKADA indisponible", operation: "DECLARED_BLOCKED",
    input: { output: { reason: "FIXTURE_SIKADA_12_HEADERS_REQUIRED" } },
    expected: { status: "BLOQUE", output: { reason: "FIXTURE_SIKADA_12_HEADERS_REQUIRED" } },
    fingerprint: "0464abd1"
  },
  {
    id: "INS-GOLD-014", version: "1.0", title: "Liaison Questionnaire santé minimisée", operation: "QS_LINK",
    input: { reference: "QS-2026-000001", administrativeResult: "ATTESTATION_RECEVABLE", medicalAnswers: ["NON", "NON"] },
    expected: { status: "REUSSI", output: { reference: "QS-2026-000001", administrativeResult: "ATTESTATION_RECEVABLE", medicalAnswersPresent: false } },
    fingerprint: "932056b2"
  },
  {
    id: "INS-GOLD-015", version: "1.0", title: "Pont Analytics incomplet", operation: "DECLARED_BLOCKED",
    input: { output: { reasons: ["FFKDA_8_DIGITS_AND_LETTER_UNSUPPORTED", "BODY_KARATE_UNAVAILABLE"] } },
    expected: { status: "BLOQUE", output: { reasons: ["FFKDA_8_DIGITS_AND_LETTER_UNSUPPORTED", "BODY_KARATE_UNAVAILABLE"] } },
    fingerprint: "226c3fdf"
  },
  {
    id: "INS-GOLD-016", version: "1.0", title: "Restauration mémoire uniquement", operation: "DECLARED_PARTIAL",
    input: { output: { memoryRestore: "VERIFIED", googleRestore: "NOT_EXECUTED" } },
    expected: { status: "PARTIEL", output: { memoryRestore: "VERIFIED", googleRestore: "NOT_EXECUTED" } },
    fingerprint: "9ceb8778"
  }
];

AKS.Tests.InscriptionsGoldDatasets = AKS.Inscriptions.GoldSupport.prepare(
  AKS.Tests.InscriptionsGoldDatasetsRaw
);
