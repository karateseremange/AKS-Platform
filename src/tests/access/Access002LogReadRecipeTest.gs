function AKS_access002LogReadFixture_(options) {
  options = options || {};
  options.recipeProfile = "LOG_READ";
  return AKS_access002RecipeFixture_(options);
}

function AKS_testAccess002LogRead_preflightReadOnly_() {
  var fixture = AKS_access002LogReadFixture_();
  var result = fixture.recipe.preflight();
  assertEquals_("LOG_READ", result.recipeProfile);
  assertEquals_(false, result.writePerformed);
  assertEquals_(1, result.accountCountProposed);
  assertEquals_(0, fixture.operations.length);
  assertEquals_(0, fixture.auditEvents.length);
  assertTrue_(JSON.stringify(result).indexOf("manager@example.com") === -1);
}

function AKS_testAccess002LogRead_grantsOnlyManageAndLog_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  var manager = fixture.accessService("manager@example.com");
  assertTrue_(manager.assertAdministrativeCapability("ACCESS_MANAGE"));
  assertEquals_("manager@example.com", AKS_authorizePrivatePortal_(manager));
  ["CONFIG_READ", "CONFIG_WRITE", "CONFIG_RESET"].forEach(function (capability) {
    assertThrows_(function () { manager.assertAdministrationCapability(capability); },
      "ACCESS_CAPABILITY_DENIED");
  });
  var registry = JSON.parse(fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_("access/1.2", registry.schemaVersion);
  assertEquals_(1, registry.accounts.length);
  assertEquals_(2, registry.accounts[0].assignments.length);
  assertEquals_(JSON.stringify(["LOG_READ"]),
    JSON.stringify(registry.accounts[0].assignments[1].extraCapabilities));
  assertEquals_(undefined, fixture.values.AKS_PRIVATE_PORTAL_ENABLED);
  assertEquals_(undefined, fixture.values.AKS_PRIVATE_BACKEND_URL);
}

function AKS_testAccess002LogRead_deniesOtherIdentity_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  assertThrows_(function () {
    AKS_authorizePrivatePortal_(fixture.accessService("denied@example.com"));
  });
}

function AKS_testAccess002LogRead_rejectsOtherTarget_() {
  var other = "1OtherRecipeScriptId1234567890";
  var fixture = AKS_access002LogReadFixture_({ scriptId: other, properties: {
    AKS_ACCESS002_RECIPE_EXPECTED_SCRIPT_ID: other
  }});
  assertThrows_(function () { fixture.recipe.apply(); }, "ACCESS_RECIPE_TARGET_REFUSED");
  assertEquals_(0, fixture.operations.length);
}

function AKS_testAccess002LogRead_rejectsExistingRegistry_() {
  [AKS_access002RecipeInitialRegistryRaw_(), ""].forEach(function (raw) {
    var fixture = AKS_access002LogReadFixture_({ registryRaw: raw });
    assertThrows_(function () { fixture.recipe.apply(); }, "ACCESS_LOG_RECIPE_INITIAL_STATE_REQUIRED");
    assertEquals_(0, fixture.operations.length);
    assertEquals_(raw, fixture.values.AKS_ACCESS_REGISTRY);
  });
}

function AKS_testAccess002LogRead_rejectsConfiguredPrivatePortal_() {
  ["AKS_PRIVATE_PORTAL_ENABLED", "AKS_PRIVATE_BACKEND_URL"].forEach(function (key) {
    var properties = {}; properties[key] = "false";
    var fixture = AKS_access002LogReadFixture_({ properties: properties });
    assertThrows_(function () { fixture.recipe.apply(); }, "ACCESS_LOG_RECIPE_PRIVATE_STATE_REQUIRED");
    assertEquals_(0, fixture.operations.length);
  });
}

function AKS_testAccess002LogRead_requiresActorAuditAndLock_() {
  [{ authorizeActor: function () { throw new Error("denied"); } },
    { persistentAudit: false }, { lockAvailable: false }].forEach(function (options) {
    var fixture = AKS_access002LogReadFixture_(options);
    assertThrows_(function () { fixture.recipe.apply(); });
    assertEquals_(0, fixture.operations.length);
  });
}

function AKS_testAccess002LogRead_backupBeforeSingleMutation_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  assertTrue_(fixture.operations.indexOf("SET:AKS_ACCESS002_RECIPE_BACKUP") <
    fixture.operations.indexOf("SET:AKS_ACCESS_REGISTRY"));
  assertEquals_(1, fixture.operations.filter(function (op) {
    return op === "SET:AKS_ACCESS_REGISTRY";
  }).length);
  var backup = JSON.parse(fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertEquals_("LOG_READ", backup.recipeProfile);
  assertEquals_(null, backup.beforeRaw);
  assertEquals_(fixture.values.AKS_ACCESS_REGISTRY, backup.afterRaw);
}

function AKS_testAccess002LogRead_idempotentAndRestoresExactly_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  assertEquals_(true, fixture.recipe.apply().alreadyApplied);
  var result = fixture.recipe.restore();
  assertEquals_(true, result.exactRestore);
  assertEquals_(true, result.backupRemoved);
  assertEquals_(undefined, fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertTrue_(fixture.auditEvents.some(function (event) {
    return event.result === "REUSSI" && event.metadata.restored === true;
  }));
}

function AKS_testAccess002LogRead_foreignBackupRefused_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  ["recipeProfile", "manager", "denied", "scriptId"].forEach(function (key) {
    var raw = fixture.values.AKS_ACCESS002_RECIPE_BACKUP;
    var backup = JSON.parse(raw); backup[key] = "foreign";
    fixture.values.AKS_ACCESS002_RECIPE_BACKUP = JSON.stringify(backup);
    var count = fixture.operations.length;
    assertThrows_(function () { fixture.recipe.apply(); }, "ACCESS_RECIPE_BACKUP_INVALID");
    assertThrows_(function () { fixture.recipe.restore(); }, "ACCESS_RECIPE_BACKUP_INVALID");
    assertEquals_(count, fixture.operations.length);
    fixture.values.AKS_ACCESS002_RECIPE_BACKUP = raw;
  });
}

function AKS_testAccess002LogRead_concurrentEditPreserved_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  var registry = JSON.parse(fixture.values.AKS_ACCESS_REGISTRY);
  registry.accounts[0].displayName = "Modification indépendante";
  var raw = JSON.stringify(registry);
  fixture.values.AKS_ACCESS_REGISTRY = raw;
  assertThrows_(function () { fixture.recipe.restore(); }, "ACCESS_RECIPE_RESTORE_CONFLICT");
  assertEquals_(raw, fixture.values.AKS_ACCESS_REGISTRY);
  assertTrue_(!!fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_testAccess002LogRead_backupFailureBeforeMutation_() {
  var fixture = AKS_access002LogReadFixture_({ beforeSet: function (key) {
    if (key === "AKS_ACCESS002_RECIPE_BACKUP") throw new Error("backup unavailable");
  }});
  assertThrows_(function () { fixture.recipe.apply(); });
  assertEquals_(undefined, fixture.values.AKS_ACCESS_REGISTRY);
}

function AKS_testAccess002LogRead_finalBackupFailureRollsBack_() {
  var fixture = AKS_access002LogReadFixture_({ beforeSet: function (key, value) {
    if (key === "AKS_ACCESS002_RECIPE_BACKUP" && JSON.parse(value).afterRevision) {
      throw new Error("final backup unavailable");
    }
  }});
  assertThrows_(function () { fixture.recipe.apply(); });
  assertEquals_(undefined, fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertEquals_(1, fixture.recipeLockReleases());
}

function AKS_testAccess002LogRead_restoreAuditFailurePreservesBackup_() {
  var fixture = AKS_access002LogReadFixture_({ failRestoreSuccessAudit: true });
  fixture.recipe.apply();
  var raw = fixture.values.AKS_ACCESS_REGISTRY;
  assertThrows_(function () { fixture.recipe.restore(); }, "ACCESS_RECIPE_AUDIT_REQUIRED");
  assertEquals_(raw, fixture.values.AKS_ACCESS_REGISTRY);
  assertTrue_(!!fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_testAccess002LogRead_incompleteBackupStops_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  var backup = JSON.parse(fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  backup.afterRevision = ""; backup.afterRaw = null;
  fixture.values.AKS_ACCESS002_RECIPE_BACKUP = JSON.stringify(backup);
  var raw = fixture.values.AKS_ACCESS_REGISTRY;
  assertThrows_(function () { fixture.recipe.apply(); }, "ACCESS_RECIPE_RECOVERY_REQUIRED");
  assertThrows_(function () { fixture.recipe.restore(); }, "ACCESS_RECIPE_BACKUP_INVALID");
  assertEquals_(raw, fixture.values.AKS_ACCESS_REGISTRY);
}

function AKS_testAccess002LogRead_serviceAuditFailureRollsBack_() {
  var fixture = AKS_access002LogReadFixture_({ beforeAudit: function (event) {
    if (event.result === "REUSSI") throw new Error("audit unavailable");
  }});
  assertThrows_(function () { fixture.recipe.apply(); });
  assertEquals_(undefined, fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_testAccess002LogRead_restoreRemainsAvailableAfterPrivateConfiguration_() {
  var fixture = AKS_access002LogReadFixture_();
  fixture.recipe.apply();
  // Independently configured values must never be removed by ACCESS restore.
  fixture.values.AKS_PRIVATE_PORTAL_ENABLED = "false";
  fixture.values.AKS_PRIVATE_BACKEND_URL = "https://example.test/exec";
  assertEquals_(true, fixture.recipe.restore().exactRestore);
  assertEquals_("false", fixture.values.AKS_PRIVATE_PORTAL_ENABLED);
  assertEquals_("https://example.test/exec", fixture.values.AKS_PRIVATE_BACKEND_URL);
}

function AKS_testAccess002LogRead_legacyCannotClaimLogBackup_() {
  var fixture = AKS_access002LogReadFixture_(); fixture.recipe.apply();
  var legacy = AKS_access002RecipeFixture_({ scriptId: AKS_privatePortalRecipeId_(),
    properties: fixture.values });
  assertThrows_(function () { legacy.recipe.apply(); }, "ACCESS_RECIPE_BACKUP_INVALID");
  assertThrows_(function () { legacy.recipe.restore(); }, "ACCESS_RECIPE_BACKUP_INVALID");
  assertEquals_(0, legacy.operations.length);
}

function AKS_testAccess002LogRead_preflightRejectsPendingRecipe_() {
  var fixture = AKS_access002LogReadFixture_(); fixture.recipe.apply();
  var count = fixture.operations.length;
  assertThrows_(function () { fixture.recipe.preflight(); }, "ACCESS_RECIPE_RECOVERY_REQUIRED");
  assertEquals_(count, fixture.operations.length);
}

function AKS_testAccess002LogRead_restoreFailureRetainsEvidence_() {
  var failRegistryRestore = false;
  var fixture = AKS_access002LogReadFixture_({ beforeSet: function (key, value) {
    if (key === "AKS_ACCESS002_RECIPE_BACKUP" && JSON.parse(value).afterRevision) {
      failRegistryRestore = true;
      throw new Error("final backup unavailable");
    }
  }, beforeDelete: function (key) {
    if (key === "AKS_ACCESS_REGISTRY" && failRegistryRestore) throw new Error("restore unavailable");
  }});
  assertThrows_(function () { fixture.recipe.apply(); });
  assertTrue_(!!fixture.values.AKS_ACCESS_REGISTRY);
  assertTrue_(!!fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertEquals_(1, fixture.recipeLockReleases());
}
