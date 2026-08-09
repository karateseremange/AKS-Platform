function AKS_access002RecipeFixture_(overrides) {
  overrides = overrides || {};
  var scriptId = "1RecipeAccess002ScriptId123456789";
  var values = {};
  var operations = [];
  var auditEvents = [];
  var registryLockReleases = 0;
  values.AKS_ACCESS002_RECIPE_ENVIRONMENT = "RECETTE";
  values.AKS_ACCESS002_RECIPE_EXPECTED_SCRIPT_ID = scriptId;
  values.AKS_ACCESS002_RECIPE_MANAGER_EMAIL = "manager@example.com";
  values.AKS_ACCESS002_RECIPE_DENIED_EMAIL = "denied@example.com";
  if (Object.prototype.hasOwnProperty.call(overrides, "registryRaw")) {
    values.AKS_ACCESS_REGISTRY = overrides.registryRaw;
  }
  Object.keys(overrides.properties || {}).forEach(function (key) {
    values[key] = overrides.properties[key];
  });
  var propertyStore = {
    getProperty: function (key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setProperty: function (key, value) {
      operations.push("SET:" + key);
      values[key] = String(value);
    },
    deleteProperty: function (key) {
      operations.push("DELETE:" + key);
      delete values[key];
    }
  };
  var audit = {
    record: function (event) {
      auditEvents.push(event);
      return { correlation_id: event.correlationId, audit_id: "aud-record" };
    },
    recordUnderExistingLock: function (event) {
      auditEvents.push(event);
      if (overrides.failRestoreSuccessAudit && event.result === "REUSSI" &&
          event.metadata.restored === true) throw new Error("audit failure");
      return { correlation_id: event.correlationId, audit_id: "aud-lock" };
    },
    isPersistentRecipeAudit: function () { return true; }
  };
  function accessService_(identity) {
    if (overrides.allowDenied && identity === "denied@example.com") {
      return { assertAdministrativeCapability: function () { return true; } };
    }
    return AKS_createAccessService_({
      identityProvider: function () { return identity; },
      registryStore: AKS_createAccessRegistryStore_(propertyStore),
      courseProvider: { list: function () { return []; } },
      legacyAdminEmails: ["admin@example.com"],
      clock: function () { return new Date("2026-09-01T10:00:00.000Z"); },
      audit: audit,
      correlationIdProvider: function () { return "corr-access002-apply"; },
      registryLock: {
        tryLock: function () { return true; },
        releaseLock: function () { registryLockReleases += 1; }
      }
    });
  }
  var recipe = AKS_createAccess002Recipe_({
    propertyStore: propertyStore,
    scriptIdProvider: function () { return overrides.scriptId || scriptId; },
    resolveActor: function () { return overrides.actor || "admin@example.com"; },
    authorizeActor: overrides.authorizeActor || function (actor) { return actor; },
    createAccessService: accessService_,
    audit: audit,
    lock: {
      tryLock: function () { return overrides.lockAvailable !== false; },
      releaseLock: function () { registryLockReleases += 1; }
    },
    clock: function () { return new Date("2026-09-01T10:00:00.000Z"); },
    idProvider: function () { return "recipe-0001"; }
  });
  return {
    recipe: recipe,
    values: values,
    operations: operations,
    auditEvents: auditEvents,
    registryLockReleases: function () { return registryLockReleases; }
  };
}

function AKS_access002RecipeInitialRegistryRaw_() {
  return JSON.stringify({
    schemaVersion: "access/1.0",
    accounts: [{
      email: "admin@example.com", displayName: "Administrateur recette",
      status: "ACTIVE", roles: ["ADMINISTRATEUR"], assignments: [],
      updatedAt: "2026-08-09T10:00:00.000Z", updatedBy: "admin@example.com"
    }]
  });
}

function AKS_testAccess002Recipe_preflightIsReadOnlyAndMinimized_() {
  var fixture = AKS_access002RecipeFixture_();
  var result = fixture.recipe.preflight();
  assertEquals_("PREFLIGHT", result.phase);
  assertEquals_(true, result.bootstrap);
  assertEquals_(false, result.writePerformed);
  assertEquals_("m***@example.com", result.manager);
  assertEquals_(0, fixture.operations.length);
}

function AKS_testAccess002Recipe_rejectsUnconfirmedTarget_() {
  var fixture = AKS_access002RecipeFixture_({ scriptId: "1AnotherRecipeScriptId123456789" });
  assertThrows_(function () { fixture.recipe.preflight(); }, "ACCESS_RECIPE_TARGET_REFUSED");
  assertEquals_(0, fixture.operations.length);
}

function AKS_testAccess002Recipe_rejectsInvalidOrPrivilegedDeniedIdentity_() {
  var privileged = {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "admin@example.com", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: []
    }, {
      email: "denied@example.com", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: []
    }]
  };
  var fixture = AKS_access002RecipeFixture_({ registryRaw: JSON.stringify(privileged) });
  assertThrows_(function () { fixture.recipe.preflight(); },
    "ACCESS_RECIPE_DENIED_IDENTITY_PRIVILEGED");
  assertEquals_(0, fixture.operations.length);
}

function AKS_testAccess002Recipe_verifiesBackupBeforeRegistryMutation_() {
  var fixture = AKS_access002RecipeFixture_();
  var result = fixture.recipe.apply();
  var backupIndex = fixture.operations.indexOf("SET:AKS_ACCESS002_RECIPE_BACKUP");
  var registryIndex = fixture.operations.indexOf("SET:AKS_ACCESS_REGISTRY");
  assertTrue_(backupIndex !== -1 && registryIndex > backupIndex);
  assertEquals_(true, result.backupVerified);
  assertEquals_(true, result.managerAccess);
  assertEquals_(false, result.deniedAccess);
}

function AKS_testAccess002Recipe_applyIsIdempotentWhileBackupMatches_() {
  var fixture = AKS_access002RecipeFixture_();
  fixture.recipe.apply();
  var registryWrites = fixture.operations.filter(function (entry) {
    return entry === "SET:AKS_ACCESS_REGISTRY";
  }).length;
  var second = fixture.recipe.apply();
  assertEquals_(true, second.alreadyApplied);
  assertEquals_(registryWrites, fixture.operations.filter(function (entry) {
    return entry === "SET:AKS_ACCESS_REGISTRY";
  }).length);
}

function AKS_testAccess002Recipe_restoresExactMissingRegistryAndRemovesBackup_() {
  var fixture = AKS_access002RecipeFixture_();
  fixture.recipe.apply();
  var result = fixture.recipe.restore();
  assertEquals_("RESTORED", result.phase);
  assertEquals_(true, result.exactRestore);
  assertEquals_(true, result.backupRemoved);
  assertEquals_(undefined, fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertEquals_(2, fixture.auditEvents.filter(function (event) {
    return event.metadata && event.metadata.restored === true;
  }).length);
  var restorationEvents = fixture.auditEvents.filter(function (event) {
    return event.metadata && event.metadata.restored === true;
  });
  assertEquals_(restorationEvents[0].correlationId, restorationEvents[1].correlationId);
}

function AKS_testAccess002Recipe_restoresExactExistingSerialization_() {
  var raw = AKS_access002RecipeInitialRegistryRaw_();
  var fixture = AKS_access002RecipeFixture_({ registryRaw: raw });
  fixture.recipe.apply();
  fixture.recipe.restore();
  assertEquals_(raw, fixture.values.AKS_ACCESS_REGISTRY);
}

function AKS_testAccess002Recipe_refusesRestoreAfterConcurrentChange_() {
  var fixture = AKS_access002RecipeFixture_();
  fixture.recipe.apply();
  fixture.values.AKS_ACCESS_REGISTRY += " ";
  assertThrows_(function () { fixture.recipe.restore(); },
    "ACCESS_RECIPE_RESTORE_CONFLICT");
  assertTrue_(!!fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_testAccess002Recipe_autoRestoresWhenDecisionVerificationFails_() {
  var fixture = AKS_access002RecipeFixture_({ allowDenied: true });
  assertThrows_(function () { fixture.recipe.apply(); }, "ACCESS_RECIPE_DENIAL_FAILED");
  assertEquals_(undefined, fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_testAccess002Recipe_rollsBackFailedFinalRestoreAudit_() {
  var fixture = AKS_access002RecipeFixture_({ failRestoreSuccessAudit: true });
  fixture.recipe.apply();
  var appliedRaw = fixture.values.AKS_ACCESS_REGISTRY;
  assertThrows_(function () { fixture.recipe.restore(); }, "ACCESS_RECIPE_AUDIT_REQUIRED");
  assertEquals_(appliedRaw, fixture.values.AKS_ACCESS_REGISTRY);
  assertTrue_(!!fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_runAccess002RecipeSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-02 — recette réversible", [
    { name: "précontrôle sans écriture et minimisé",
      test: AKS_testAccess002Recipe_preflightIsReadOnlyAndMinimized_ },
    { name: "cible non confirmée refusée",
      test: AKS_testAccess002Recipe_rejectsUnconfirmedTarget_ },
    { name: "identité de refus privilégiée rejetée",
      test: AKS_testAccess002Recipe_rejectsInvalidOrPrivilegedDeniedIdentity_ },
    { name: "sauvegarde vérifiée avant mutation",
      test: AKS_testAccess002Recipe_verifiesBackupBeforeRegistryMutation_ },
    { name: "application idempotente",
      test: AKS_testAccess002Recipe_applyIsIdempotentWhileBackupMatches_ },
    { name: "registre absent restauré exactement",
      test: AKS_testAccess002Recipe_restoresExactMissingRegistryAndRemovesBackup_ },
    { name: "sérialisation existante restaurée exactement",
      test: AKS_testAccess002Recipe_restoresExactExistingSerialization_ },
    { name: "conflit de restauration refusé",
      test: AKS_testAccess002Recipe_refusesRestoreAfterConcurrentChange_ },
    { name: "échec de vérification auto-restauré",
      test: AKS_testAccess002Recipe_autoRestoresWhenDecisionVerificationFails_ },
    { name: "échec d'audit final annule la restauration",
      test: AKS_testAccess002Recipe_rollsBackFailedFinalRestoreAudit_ }
  ]);
}
