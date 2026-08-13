function AKS_access002HistoryRow_(overrides) {
  var metadata = {
    beforeRevision: "access-rev/1-a-a-a", proposedRevision: "access-rev/1-b-b-b",
    afterRevision: "access-rev/1-b-b-b", changedAccountIds: ["target@example.com"],
    changedCount: 1, selfModification: false, restored: false,
    requestId: "req-history-001", operation: "SAVE_ACCOUNT_ACCESS",
    comment: "Ajustement annuel", sensitive: false,
    rolesAdded: ["CONSULTATION"], rolesRemoved: [],
    assignmentsAdded: 1, assignmentsRemoved: 0
  };
  var row = {
    schema_version: "aks-audit/1.0", audit_id: "aud-history-001",
    occurred_at: "2026-09-01T10:00:00.000Z", environment: "RECETTE",
    actor_type: "ADMIN", actor_id: "admin@example.com",
    action: "ACCESS_REGISTRY_UPDATE", module: "ACCESS",
    target_type: "ACCESS_REGISTRY", target_id: "AKS_ACCESS_REGISTRY",
    result: "REUSSI", reason_code: "", correlation_id: "corr-history-001",
    metadata_json: JSON.stringify(metadata), created_at: "2026-09-01T10:00:00.001Z",
    created_by: "system@example.com"
  };
  Object.keys(overrides || {}).forEach(function (key) { row[key] = overrides[key]; });
  return AKS.Core.AuditCatalogs.headers.map(function (header) { return row[header]; });
}

function AKS_access002HistoryFixture_(overrides) {
  overrides = overrides || {};
  var authorizations = 0;
  var rows = overrides.rows || [AKS_access002HistoryRow_()];
  return {
    service: AKS_createAccessAccountHistoryService_({
      accessService: { assertAdministrativeCapability: function () {
        authorizations += 1;
        if (overrides.denied) {
          var failure = new Error("Refus"); failure.code = "ACCESS_CAPABILITY_DENIED";
          throw failure;
        }
        return true;
      }},
      gateway: {
        getHeaders: function () {
          return (overrides.headers || AKS.Core.AuditCatalogs.headers).slice();
        },
        listRows: function () { return rows.map(function (row) { return row.slice(); }); }
      }
    }),
    authorizations: function () { return authorizations; }
  };
}

function AKS_testAccess002History_returnsMinimizedMatchingProofs_() {
  var unrelated = AKS_access002HistoryRow_({
    audit_id: "aud-other", metadata_json: JSON.stringify({ changedAccountIds: ["other@example.com"] })
  });
  var result = AKS_access002HistoryFixture_({
    rows: [unrelated, AKS_access002HistoryRow_()]
  }).service.getAccountHistory(" TARGET@EXAMPLE.COM ", "");
  assertEquals_(1, result.entries.length);
  assertEquals_("a***@example.com", result.entries[0].actor);
  assertEquals_("Ajustement annuel", result.entries[0].comment);
  assertEquals_(JSON.stringify(["CONSULTATION"]),
    JSON.stringify(result.entries[0].summary.rolesAdded));
  assertEquals_(undefined, result.entries[0].correlationId);
  assertEquals_(undefined, result.entries[0].metadataJson);
}

function AKS_testAccess002History_paginatesNewestFirst_() {
  var rows = [];
  for (var index = 0; index < 21; index += 1) {
    rows.push(AKS_access002HistoryRow_({
      audit_id: "aud-history-" + index,
      occurred_at: "2026-09-" + (index < 9 ? "0" : "") + (index + 1) + "T10:00:00.000Z"
    }));
  }
  var service = AKS_access002HistoryFixture_({ rows: rows }).service;
  var first = service.getAccountHistory("target@example.com", "");
  assertEquals_(20, first.entries.length);
  assertEquals_(true, first.hasMore);
  assertEquals_("access-history/1/20", first.nextCursor);
  var second = service.getAccountHistory("target@example.com", first.nextCursor);
  assertEquals_(1, second.entries.length);
  assertEquals_(false, second.hasMore);
}

function AKS_testAccess002History_reauthorizesEveryPage_() {
  var fixture = AKS_access002HistoryFixture_();
  fixture.service.getAccountHistory("target@example.com", "");
  fixture.service.getAccountHistory("target@example.com", "");
  assertEquals_(2, fixture.authorizations());
  assertThrows_(function () {
    AKS_access002HistoryFixture_({ denied: true }).service
      .getAccountHistory("target@example.com", "");
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testAccess002History_rejectsInvalidTargetCursorAndSchema_() {
  var service = AKS_access002HistoryFixture_().service;
  assertThrows_(function () { service.getAccountHistory("invalid", ""); },
    "ACCESS_ACCOUNT_ID_INVALID");
  assertThrows_(function () {
    service.getAccountHistory("target@example.com", "page-2");
  }, "ACCESS_HISTORY_CURSOR_INVALID");
  assertThrows_(function () {
    AKS_access002HistoryFixture_({ headers: ["bad"] }).service
      .getAccountHistory("target@example.com", "");
  }, "ACCESS_HISTORY_UNAVAILABLE");
}

function AKS_testAccess002History_returnsImmutableView_() {
  var result = AKS_access002HistoryFixture_().service
    .getAccountHistory("target@example.com", "");
  assertTrue_(Object.isFrozen(result));
  assertTrue_(Object.isFrozen(result.entries));
  assertTrue_(Object.isFrozen(result.entries[0].summary.rolesAdded));
}

function AKS_runAccess002AccountHistorySuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-04 — historique fonctionnel", [
    { name: "preuves ciblées minimisées", test: AKS_testAccess002History_returnsMinimizedMatchingProofs_ },
    { name: "pagination décroissante", test: AKS_testAccess002History_paginatesNewestFirst_ },
    { name: "réautorisation de chaque page", test: AKS_testAccess002History_reauthorizesEveryPage_ },
    { name: "cible curseur et schéma refusés", test: AKS_testAccess002History_rejectsInvalidTargetCursorAndSchema_ },
    { name: "vue profondément immuable", test: AKS_testAccess002History_returnsImmutableView_ }
  ]);
}
