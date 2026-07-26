function AKS_testAnalyticsConsolidator_acceptsNominalSet_() {
  var result = AKS.Analytics.Consolidator.consolidate({
    attendances: [
      { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" }
    ]
  });
  assertEquals_(1, result.accepted.length);
  assertEquals_("VALIDE", result.state);
}

function AKS_testAnalyticsConsolidator_neutralizesIdenticalDuplicates_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets[4];
  var result = AKS.Analytics.Consolidator.consolidate({ attendances: gold.input.attendances });
  assertEquals_(gold.expected.accepted, result.accepted.length);
  assertEquals_(gold.expected.duplicatesNeutralized, result.duplicates.length);
  assertEquals_(gold.expected.rejected, result.rejected.length);
}

function AKS_testAnalyticsConsolidator_rejectsEntireConflictingGroup_() {
  var result = AKS.Analytics.Consolidator.consolidate({
    attendances: [
      { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
      { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "ABSENT" }
    ]
  });
  assertEquals_(0, result.accepted.length);
  assertEquals_(2, result.rejected.length);
  assertEquals_("DOUBLON_CONTRADICTOIRE", result.diagnostics.errors[0].code);
  assertEquals_("ERREUR", result.state);
}

function AKS_testAnalyticsConsolidator_usesBusinessAttendanceKey_() {
  var key = AKS.Analytics.Consolidator.attendanceKey({
    season: "2026-2027", course_code: "baby", session_date: "2026-09-05", licencie_id: "LIC-000001"
  });
  assertEquals_("2026-2027|BABY|2026-09-05|LIC-000001", key);
}

function AKS_testAnalyticsConsolidator_detectsSharedLicenceNumber_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets[6];
  var result = AKS.Analytics.Consolidator.consolidate({ members: gold.input.members });
  assertEquals_(gold.expected.duplicateLicenceError, result.diagnostics.errors[0].code);
  assertEquals_(2, result.diagnostics.errors[0].details.licencie_ids.length);
}

function AKS_testAnalyticsConsolidator_keepsLicencieIdAsIdentity_() {
  var result = AKS.Analytics.Consolidator.consolidate({
    attendances: [
      { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000007", status: "PRESENT" },
      { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000008", status: "PRESENT" }
    ],
    members: [
      { licencie_id: "LIC-000007", numero_licence: "12345678" },
      { licencie_id: "LIC-000008", numero_licence: "12345678" }
    ]
  });
  assertEquals_(2, result.accepted.length);
  assertEquals_("PARTIEL", result.state);
}

function AKS_testAnalyticsConsolidator_isOrderIndependent_() {
  var rows = AKS.Tests.AnalyticsGoldDatasets[4].input.attendances;
  var first = AKS.Analytics.Consolidator.consolidate({ attendances: rows });
  var second = AKS.Analytics.Consolidator.consolidate({ attendances: rows.slice().reverse() });
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first.accepted, second.accepted).length);
  assertEquals_(first.state, second.state);
}

function AKS_testAnalyticsConsolidator_isIdempotent_() {
  var rows = AKS.Tests.AnalyticsGoldDatasets[4].input.attendances;
  var first = AKS.Analytics.Consolidator.consolidate({ attendances: rows });
  var second = AKS.Analytics.Consolidator.consolidate({ attendances: first.accepted });
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first.accepted, second.accepted).length);
  assertEquals_(0, second.duplicates.length);
  assertEquals_("VALIDE", second.state);
}

function AKS_testAnalyticsConsolidator_doesNotMutateInput_() {
  var input = { attendances: AKS.Tests.AnalyticsGoldDatasets[4].input.attendances };
  var before = JSON.stringify(input);
  var result = AKS.Analytics.Consolidator.consolidate(input);
  assertEquals_(before, JSON.stringify(input));
  assertTrue_(Object.isFrozen(result), "Le résultat doit être profondément immuable.");
  assertTrue_(Object.isFrozen(result.accepted), "Les présences acceptées doivent être immuables.");
}

function AKS_testAnalyticsConsolidator_aggregatesDiagnostics_() {
  var result = AKS.Analytics.Consolidator.consolidate({
    attendances: [],
    warnings: [{ code: "SOURCE_PARTIELLE" }],
    exclusions: [{ code: "LIGNE_EXCLUE" }]
  });
  assertEquals_(1, result.diagnostics.warnings.length);
  assertEquals_(1, result.diagnostics.exclusions.length);
  assertEquals_("ERREUR", result.state);
}

function AKS_runAnalyticsConsolidatorSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — consolidation", [
    { name: "ANALYTICS / ensemble nominal", test: AKS_testAnalyticsConsolidator_acceptsNominalSet_ },
    { name: "ANALYTICS / doublons identiques", test: AKS_testAnalyticsConsolidator_neutralizesIdenticalDuplicates_ },
    { name: "ANALYTICS / contradictions rejetées", test: AKS_testAnalyticsConsolidator_rejectsEntireConflictingGroup_ },
    { name: "ANALYTICS / clé métier présence", test: AKS_testAnalyticsConsolidator_usesBusinessAttendanceKey_ },
    { name: "ANALYTICS / numéro fédéral partagé", test: AKS_testAnalyticsConsolidator_detectsSharedLicenceNumber_ },
    { name: "ANALYTICS / identité licencie_id", test: AKS_testAnalyticsConsolidator_keepsLicencieIdAsIdentity_ },
    { name: "ANALYTICS / indépendance à l'ordre", test: AKS_testAnalyticsConsolidator_isOrderIndependent_ },
    { name: "ANALYTICS / idempotence", test: AKS_testAnalyticsConsolidator_isIdempotent_ },
    { name: "ANALYTICS / absence de mutation", test: AKS_testAnalyticsConsolidator_doesNotMutateInput_ },
    { name: "ANALYTICS / agrégation diagnostics", test: AKS_testAnalyticsConsolidator_aggregatesDiagnostics_ }
  ]);
}
