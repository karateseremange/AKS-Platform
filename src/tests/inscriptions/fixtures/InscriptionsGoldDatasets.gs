var AKS = AKS || {};
AKS.Tests = AKS.Tests || {};

AKS.Tests.InscriptionsGoldDatasetsRaw = [
  {
    id: "INS-GOLD-001", version: "1.0", title: "Import nominal Karaté et états initiaux", operation: "CREATE_DOSSIER",
    input: { source: "KARATE", submittedAt: "2026-09-05T14:30:00+02:00", row: { "Nom": " Durand ", "Prénom": "Élise", "Date de naissance": "2014-03-02", "Adresse e-mail": "famille@example.test" } },
    expected: { status: "REUSSI", output: { person: { source: "KARATE", lastName: "DURAND", firstName: "ELISE", birthDate: "2014-03-02", email: "FAMILLE@EXAMPLE.TEST", synthesis: "ABSENT" }, submittedAtUtc: "2026-09-05T12:30:00.000Z", timeZone: "Europe/Paris", states: { reception: "RECUE", verification: "A_EVALUER", preparation: "NON_PREPARE", activation: "INACTIF" } } },
    fingerprint: "1f78c977"
  },
  {
    id: "INS-GOLD-002", version: "1.0", title: "Formulaire féminin avec champs absents par contrat", operation: "ADAPT_FORM",
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
    id: "INS-GOLD-004", version: "1.0", title: "Valeurs absentes, invalides et conversion temporelle", operation: "NORMALIZE_VALUES",
    input: { values: [null, "", "non", "Oui", "peut-être"], submittedAt: "2026-07-01T18:15:00+02:00", sourceTimeZone: "Africa/Ceuta" },
    expected: { status: "REUSSI", output: { answers: ["ABSENT", "ABSENT", "NON", "OUI", "INVALIDE"], submittedAtUtc: "2026-07-01T16:15:00.000Z", sourceTimeZone: "Africa/Ceuta", targetTimeZone: "Europe/Paris" } },
    fingerprint: "857f039f"
  },
  {
    id: "INS-GOLD-005", version: "1.0", title: "Réponses connues, déplacées, modifiées et dupliquées", operation: "DETECT_RESPONSES",
    input: { responses: [
      { responseId: "FORM-001", originalRow: 2, currentRow: 2, originalFingerprint: "aaa", currentFingerprint: "aaa" },
      { responseId: "FORM-002", originalRow: 3, currentRow: 7, originalFingerprint: "bbb", currentFingerprint: "bbb" },
      { responseId: "FORM-003", originalRow: 4, currentRow: 4, originalFingerprint: "ccc", currentFingerprint: "ddd" },
      { responseId: "FORM-001", originalRow: 2, currentRow: 8, originalFingerprint: "aaa", currentFingerprint: "aaa" }
    ] },
    expected: { status: "REUSSI", output: [
      { responseId: "FORM-001", status: "CONNUE" }, { responseId: "FORM-002", status: "DEPLACEE" },
      { responseId: "FORM-003", status: "MODIFIEE" }, { responseId: "FORM-001", status: "DUPLIQUEE" }
    ] },
    fingerprint: "ebbbf501"
  },
  {
    id: "INS-GOLD-006", version: "1.0", title: "Rapprochements certain, probable, ambigu et absent", operation: "MATCH_BATCH",
    input: {
      subjects: [
        { lastName: "Durand", firstName: "Élise", birthDate: "2014-03-02", email: "famille@example.test" },
        { lastName: "Durand", firstName: "Élise", birthDate: "2014-03-02", email: "nouveau@example.test" },
        { lastName: "Martin", firstName: "Léo", birthDate: "2012-09-01", email: "x@example.test" },
        { lastName: "Inconnu", firstName: "Nora", birthDate: "2010-01-01", email: "nora@example.test" }
      ],
      candidates: [
        { id: "LIC-000001", lastName: "DURAND", firstName: "ELISE", birthDate: "2014-03-02", email: "famille@example.test" },
        { id: "LIC-000003", lastName: "MARTIN", firstName: "LEO", birthDate: "2012-09-01", email: "a@example.test" },
        { id: "LIC-000002", lastName: "MARTIN", firstName: "LEO", birthDate: "2012-09-01", email: "b@example.test" }
      ]
    },
    expected: { status: "REUSSI", output: [
      { decision: "CERTAIN", ids: ["LIC-000001"] }, { decision: "PROBABLE", ids: ["LIC-000001"] },
      { decision: "AMBIGU", ids: ["LIC-000002", "LIC-000003"] }, { decision: "ABSENT", ids: [] }
    ] },
    fingerprint: "c50d26c3"
  },
  {
    id: "INS-GOLD-007", version: "1.0", title: "Mineurs et responsables légaux partagés", operation: "BUILD_GUARDIANS",
    input: { minors: [
      { id: "LIC-000010", guardians: [{ email: "parent.commun@example.test" }, { email: "parent.a@example.test" }] },
      { id: "LIC-000011", guardians: [{ email: "parent.commun@example.test" }] }
    ] },
    expected: { status: "REUSSI", output: {
      guardians: [{ id: "RSP-000002", email: "PARENT.A@EXAMPLE.TEST" }, { id: "RSP-000001", email: "PARENT.COMMUN@EXAMPLE.TEST" }],
      links: [{ minorId: "LIC-000010", guardianId: "RSP-000001" }, { minorId: "LIC-000010", guardianId: "RSP-000002" }, { minorId: "LIC-000011", guardianId: "RSP-000001" }]
    } },
    fingerprint: "3776cf97"
  },
  {
    id: "INS-GOLD-008", version: "1.0", title: "Allocation concurrente sans collision et numéros consommés", operation: "ALLOCATE",
    input: {
      counters: { "LIC|GLOBAL|GLOBAL": 1, "IMP|2026|FORMS": 1 },
      issuedIds: ["LIC-000001", "IMP-2026-000001"],
      requests: [
        { worker: "A", type: "LIC" }, { worker: "B", type: "RSP" },
        { worker: "A", type: "INS", year: "2026" },
        { worker: "B", type: "IMP", year: "2026", importType: "FORMS" },
        { worker: "A", type: "IMP", year: "2026", importType: "SIKADA" }
      ]
    },
    expected: { status: "REUSSI", output: {
      ids: ["LIC-000002", "RSP-000001", "INS-2026-000001", "IMP-2026-000002", "IMP-2026-000003"],
      counters: { "LIC|GLOBAL|GLOBAL": 2, "IMP|2026|FORMS": 2, "RSP|GLOBAL|GLOBAL": 1, "INS|2026|GLOBAL": 1, "IMP|2026|SIKADA": 3 },
      unique: true, lockOrder: ["A", "B", "A", "B", "A"]
    } },
    fingerprint: "1c1fe525"
  },
  {
    id: "INS-GOLD-009", version: "1.0", title: "Idempotence, conflit et reprise après interruption", operation: "IDEMPOTENCY",
    input: { commands: [
      { key: "REQ-1", payload: { value: 1 }, interruptAfterPrepare: true },
      { key: "REQ-1", payload: { value: 1 } }, { key: "REQ-1", payload: { value: 1 } }, { key: "REQ-1", payload: { value: 2 } }
    ] },
    expected: { status: "REUSSI", output: { outcomes: ["INTERROMPUE", "REPRISE", "REJOUEE", "CONFLIT"], uniqueCommands: 1, completedCommands: 1 } },
    fingerprint: "24a3d26c"
  },
  {
    id: "INS-GOLD-010", version: "1.0", title: "Transitions des quatre axes du dossier", operation: "TRANSITIONS",
    input: { axes: {
      reception: { initial: "RECUE", targets: ["VALIDEE", "A_EVALUER", "VALIDEE"] },
      verification: { initial: "A_EVALUER", targets: ["A_CORRIGER", "A_EVALUER", "VERIFIEE"] },
      preparation: { initial: "NON_PREPARE", targets: ["PRET", "EN_PREPARATION", "PRET"] },
      activation: { initial: "INACTIF", targets: ["SUSPENDU", "ACTIF", "SUSPENDU", "INACTIF"] }
    } },
    expected: { status: "REUSSI", output: {
      reception: { finalState: "VALIDEE", accepted: [false, true, true] },
      verification: { finalState: "VERIFIEE", accepted: [true, true, true] },
      preparation: { finalState: "PRET", accepted: [false, true, true] },
      activation: { finalState: "INACTIF", accepted: [false, true, true, true] }
    } },
    fingerprint: "67d38c22"
  },
  {
    id: "INS-GOLD-011", version: "1.0", title: "Refus d'accès avant toute lecture du dépôt", operation: "ACCESS_GATE",
    input: { capability: "INSCRIPTIONS_READ", accessAllowed: false, missingCapabilities: ["INSCRIPTIONS_READ", "INSCRIPTIONS_WRITE"] },
    expected: { status: "REUSSI", output: { decision: "REFUSE", repositoryReads: 0, missingCapabilities: ["INSCRIPTIONS_READ", "INSCRIPTIONS_WRITE"] } },
    fingerprint: "4801afcc"
  },
  {
    id: "INS-GOLD-012", version: "1.0", title: "Échec de l'audit obligatoire sans commit", operation: "AUDITED_COMMAND",
    input: { auditSucceeds: false, command: { type: "CREATE_DOSSIER" }, auditEvent: { type: "DOSSIER_PREPARE" } },
    expected: { status: "REUSSI", output: { committed: false, reported: "AUDIT_REQUIRED" } },
    fingerprint: "cfd547da"
  },
  {
    id: "INS-GOLD-013", version: "1.0", title: "Prérequis SIKADA réellement contrôlé", operation: "CHECK_PREREQUISITES",
    input: { required: ["SIKADA_12_HEADERS", "WINDOWS_1252", "FORMULA_ESCAPING"], available: ["FORMULA_ESCAPING"] },
    expected: { status: "BLOQUE", output: { ready: false, missing: ["SIKADA_12_HEADERS", "WINDOWS_1252"] } },
    fingerprint: "13eddfe7"
  },
  {
    id: "INS-GOLD-014", version: "1.0", title: "Liaison Questionnaire santé minimisée", operation: "QS_LINK",
    input: { reference: "QS-2026-000001", administrativeResult: "ATTESTATION_RECEVABLE" },
    expected: { status: "REUSSI", output: { reference: "QS-2026-000001", administrativeResult: "ATTESTATION_RECEVABLE", medicalAnswersPresent: false } },
    fingerprint: "056c7c4a"
  },
  {
    id: "INS-GOLD-015", version: "1.0", title: "Prérequis du pont Analytics réellement contrôlés", operation: "CHECK_PREREQUISITES",
    input: { required: ["FFKDA_8_DIGITS_AND_LETTER", "BODY_KARATE"], available: [] },
    expected: { status: "BLOQUE", output: { ready: false, missing: ["FFKDA_8_DIGITS_AND_LETTER", "BODY_KARATE"] } },
    fingerprint: "c722309f"
  },
  {
    id: "INS-GOLD-016", version: "1.0", title: "Restauration mémoire exécutée", operation: "RESTORE_MEMORY",
    input: { before: { records: [{ id: "LIC-000001", state: "ACTIF" }] }, attemptedRecords: [{ id: "LIC-000001", state: "SUSPENDU" }], failAfterWrite: true },
    expected: { status: "PARTIEL", output: { restored: true, final: { records: [{ id: "LIC-000001", state: "ACTIF" }] }, googleRestore: "NON_EXECUTEE" } },
    fingerprint: "37c0c9d9"
  }
];

AKS.Tests.InscriptionsGoldDatasets = AKS.Inscriptions.GoldSupport.prepare(
  AKS.Tests.InscriptionsGoldDatasetsRaw
);
