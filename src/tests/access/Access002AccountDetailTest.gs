function AKS_access002DetailFixture_(overrides) {
  overrides = overrides || {};
  var base = AKS_access002AdminFixture_(overrides);
  return {
    service: AKS_createAccessAccountDetailService_({ accessAdmin: base.service }),
    writes: base.writes,
    auditEvents: base.auditEvents,
    registry: base.registry
  };
}

function AKS_access002SaveCommand_(detail, overrides) {
  var command = {
    accountId: detail.account.accountId,
    expectedRevision: detail.revision,
    requestId: "req-access00204-save-001",
    comment: "Ajustement validé",
    confirmSensitive: false,
    roles: detail.account.roles.slice(),
    assignments: JSON.parse(JSON.stringify(detail.account.assignments))
  };
  Object.keys(overrides || {}).forEach(function (key) { command[key] = overrides[key]; });
  return command;
}

function AKS_testAccess002Detail_returnsMinimizedTargetAndCatalogues_() {
  var result = AKS_access002DetailFixture_().service
    .getAccountDetail(" TEACHER@EXAMPLE.COM ");
  assertEquals_("teacher@example.com", result.account.accountId);
  assertEquals_("ACTIVE", result.account.status);
  assertEquals_(true, result.account.editable);
  assertEquals_("ATTENDANCE", result.account.assignments[0].module);
  assertEquals_(undefined, result.account.email);
  assertEquals_("access/1.1", result.catalogues.schemaVersion);
  assertTrue_(Object.isFrozen(result));
  assertTrue_(Object.isFrozen(result.catalogues.modules));
}

function AKS_testAccess002Detail_rejectsInvalidOrUnknownTarget_() {
  var service = AKS_access002DetailFixture_().service;
  assertThrows_(function () { service.getAccountDetail("not-an-email"); },
    "ACCESS_ACCOUNT_ID_INVALID");
  assertThrows_(function () { service.getAccountDetail("absent@example.com"); },
    "ACCESS_ACCOUNT_NOT_FOUND");
}

function AKS_testAccess002Detail_propagatesAdministrativeRefusal_() {
  var fixture = AKS_access002DetailFixture_({ identity: "teacher@example.com" });
  assertThrows_(function () {
    fixture.service.getAccountDetail("teacher@example.com");
  }, "ACCESS_CAPABILITY_DENIED");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_previewsRolesWithoutWrite_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  var result = fixture.service.previewAccountAccess({
    accountId: "teacher@example.com", expectedRevision: before.revision,
    roles: ["PROFESSEUR", "CONSULTATION"],
    assignments: before.account.assignments
  });
  assertEquals_(true, result.changed);
  assertEquals_(JSON.stringify(["CONSULTATION"]),
    JSON.stringify(result.summary.rolesAdded));
  assertEquals_(0, result.summary.assignmentsAdded.length);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_previewsIndependentAnalytics_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  var assignments = JSON.parse(JSON.stringify(before.account.assignments));
  assignments.push({
    module: "ANALYTICS", season: "*", section: "", courseCode: "",
    status: "ACTIVE", roles: ["PROFESSEUR"],
    capabilities: ["ANALYTICS_READ", "ANALYTICS_PREVIEW"],
    validFrom: "", validUntil: ""
  });
  var result = fixture.service.previewAccountAccess({
    accountId: "teacher@example.com", expectedRevision: before.revision,
    roles: before.account.roles, assignments: assignments
  });
  assertEquals_(1, result.summary.assignmentsAdded.length);
  assertEquals_("ANALYTICS", result.summary.assignmentsAdded[0].module);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_returnsNoChangeSummary_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  var result = fixture.service.previewAccountAccess({
    accountId: "teacher@example.com", expectedRevision: before.revision,
    roles: before.account.roles, assignments: before.account.assignments
  });
  assertEquals_(false, result.changed);
  assertEquals_(0, result.summary.rolesAdded.length);
  assertEquals_(0, result.summary.rolesRemoved.length);
  assertEquals_(0, result.summary.assignmentsAdded.length);
  assertEquals_(0, result.summary.assignmentsRemoved.length);
}

function AKS_testAccess002Detail_rejectsStalePreview_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  assertThrows_(function () {
    fixture.service.previewAccountAccess({
      accountId: "teacher@example.com", expectedRevision: "stale",
      roles: before.account.roles, assignments: before.account.assignments
    });
  }, "ACCESS_REGISTRY_CONFLICT");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_rejectsInvalidProposalWithoutWrite_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  assertThrows_(function () {
    fixture.service.previewAccountAccess({
      accountId: "teacher@example.com", expectedRevision: before.revision,
      roles: ["SUPER_ADMIN"], assignments: before.account.assignments
    });
  }, "ACCESS_REGISTRY_INVALID");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_rejectsInactiveModification_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("teacher@example.com");
  var inactiveFixture = AKS_access002DetailFixture_({ registry: {
    schemaVersion: "access/1.1", accounts: [{
      email: "admin@example.com", displayName: "Admin", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", section: "", courseCode: "",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
      }]
    }, {
      email: "teacher@example.com", displayName: "Ancien", status: "INACTIVE",
      roles: ["PROFESSEUR"], assignments: []
    }]
  }});
  var inactive = inactiveFixture.service.getAccountDetail("teacher@example.com");
  assertEquals_(false, inactive.account.editable);
  assertThrows_(function () {
    inactiveFixture.service.previewAccountAccess({
      accountId: "teacher@example.com", expectedRevision: inactive.revision,
      roles: detail.account.roles, assignments: []
    });
  }, "ACCESS_ACCOUNT_INACTIVE");
  assertEquals_(0, inactiveFixture.writes());
}

function AKS_testAccess002Detail_savesOnlyTargetWithAuditContext_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("teacher@example.com");
  var command = AKS_access002SaveCommand_(detail);
  command.roles.push("CONSULTATION");
  var result = fixture.service.saveAccountAccess(command);
  assertEquals_(true, result.changed);
  assertEquals_("req-access00204-save-001", result.requestId);
  assertEquals_(1, fixture.writes());
  assertEquals_(2, fixture.registry().accounts.length);
  assertEquals_("admin@example.com", fixture.registry().accounts[0].email);
  assertEquals_(2, fixture.auditEvents.length);
  assertEquals_("req-access00204-save-001",
    fixture.auditEvents[1].metadata.requestId);
  assertEquals_("Ajustement validé", fixture.auditEvents[1].metadata.comment);
  assertEquals_("SAVE_ACCOUNT_ACCESS", fixture.auditEvents[1].metadata.operation);
}

function AKS_testAccess002Detail_rejectsNoChangeWithoutWrite_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("teacher@example.com");
  assertThrows_(function () {
    fixture.service.saveAccountAccess(AKS_access002SaveCommand_(detail));
  }, "ACCESS_NO_CHANGE");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_requiresSensitiveManageConfirmation_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("teacher@example.com");
  var command = AKS_access002SaveCommand_(detail);
  command.assignments.push({
    module: "ACCESS", season: "*", section: "", courseCode: "",
    status: "ACTIVE", roles: ["PROFESSEUR"],
    capabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
  });
  assertThrows_(function () { fixture.service.saveAccountAccess(command); },
    "ACCESS_SENSITIVE_CONFIRMATION_REQUIRED");
  assertEquals_(0, fixture.writes());
  command.confirmSensitive = true;
  var result = fixture.service.saveAccountAccess(command);
  assertEquals_(true, result.sensitive);
  assertEquals_(1, fixture.writes());
}

function AKS_testAccess002Detail_requiresSelfModificationConfirmation_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("admin@example.com");
  var command = AKS_access002SaveCommand_(detail, {
    requestId: "req-access00204-self-001",
    roles: ["ADMINISTRATEUR", "CONSULTATION"]
  });
  assertThrows_(function () { fixture.service.saveAccountAccess(command); },
    "ACCESS_SENSITIVE_CONFIRMATION_REQUIRED");
  assertEquals_(0, fixture.writes());
  command.confirmSensitive = true;
  var result = fixture.service.saveAccountAccess(command);
  assertEquals_(true, result.sensitive);
  assertEquals_(1, fixture.writes());
}

function AKS_testAccess002Detail_doubleSubmissionMutatesOnce_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("teacher@example.com");
  var command = AKS_access002SaveCommand_(detail);
  command.roles.push("CONSULTATION");
  fixture.service.saveAccountAccess(command);
  assertThrows_(function () { fixture.service.saveAccountAccess(command); },
    "ACCESS_REGISTRY_CONFLICT");
  assertEquals_(1, fixture.writes());
}

function AKS_testAccess002Detail_rejectsInvalidRequestMetadata_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("teacher@example.com");
  var invalidId = AKS_access002SaveCommand_(detail, { requestId: "invalid" });
  invalidId.roles.push("CONSULTATION");
  assertThrows_(function () { fixture.service.saveAccountAccess(invalidId); },
    "ACCESS_COMMAND_INVALID");
  var longComment = AKS_access002SaveCommand_(detail, {
    comment: new Array(502).join("x")
  });
  longComment.roles.push("CONSULTATION");
  assertThrows_(function () { fixture.service.saveAccountAccess(longComment); },
    "ACCESS_COMMAND_INVALID");
  assertEquals_(0, fixture.writes());
}

function AKS_runAccess002AccountDetailSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-04 — fiche et prévisualisation", [
    { name: "fiche minimisée et catalogues", test: AKS_testAccess002Detail_returnsMinimizedTargetAndCatalogues_ },
    { name: "cible invalide ou inconnue", test: AKS_testAccess002Detail_rejectsInvalidOrUnknownTarget_ },
    { name: "refus administratif propagé", test: AKS_testAccess002Detail_propagatesAdministrativeRefusal_ },
    { name: "prévisualisation des rôles", test: AKS_testAccess002Detail_previewsRolesWithoutWrite_ },
    { name: "prévisualisation Analytics autonome", test: AKS_testAccess002Detail_previewsIndependentAnalytics_ },
    { name: "synthèse sans changement", test: AKS_testAccess002Detail_returnsNoChangeSummary_ },
    { name: "révision obsolète refusée", test: AKS_testAccess002Detail_rejectsStalePreview_ },
    { name: "proposition invalide refusée", test: AKS_testAccess002Detail_rejectsInvalidProposalWithoutWrite_ },
    { name: "compte inactif non modifiable", test: AKS_testAccess002Detail_rejectsInactiveModification_ }
    ,{ name: "enregistrement ciblé audité", test: AKS_testAccess002Detail_savesOnlyTargetWithAuditContext_ }
    ,{ name: "absence de changement refusée", test: AKS_testAccess002Detail_rejectsNoChangeWithoutWrite_ }
    ,{ name: "confirmation ACCESS_MANAGE", test: AKS_testAccess002Detail_requiresSensitiveManageConfirmation_ }
    ,{ name: "confirmation auto-modification", test: AKS_testAccess002Detail_requiresSelfModificationConfirmation_ }
    ,{ name: "double soumission bornée", test: AKS_testAccess002Detail_doubleSubmissionMutatesOnce_ }
    ,{ name: "métadonnées de commande bornées", test: AKS_testAccess002Detail_rejectsInvalidRequestMetadata_ }
  ]);
}
