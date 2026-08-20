function AKS_access002RecoveryFixture_(options) {
  options = options || {};
  var calls = [];
  var initialRaw = options.initialRaw || JSON.stringify({
    schemaVersion: "access/1.1",
    revision: "rev-initial",
    accounts: []
  });
  var values = { AKS_ACCESS_REGISTRY: initialRaw };

  var store = {
    getProperty: function (key) {
      calls.push("get:" + key);
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setProperty: function (key, value) {
      calls.push("set:" + key);
      values[key] = value;
    },
    deleteProperty: function (key) {
      calls.push("delete:" + key);
      delete values[key];
    }
  };

  var base = {
    preflight: function () {
      calls.push("base:preflight");
      return {
        environment: "RECETTE",
        scriptIdSuffix: "eIRxs4",
        registryRevision: "rev-initial"
      };
    },
    apply: function () {
      calls.push("base:apply");
      values.AKS_ACCESS002_RECIPE_BACKUP = "backup";
      values.AKS_ACCESS_REGISTRY = JSON.stringify({
        schemaVersion: "access/1.2",
        revision: "rev-temporary",
        accounts: [{ accountId: "manager@example.com" }]
      });
      if (options.failApply) {
        throw new Error("temporary verification failure");
      }
      return { revision: "rev-temporary" };
    },
    restore: function () {
      calls.push("base:restore");
      if (options.failRestore) {
        throw new Error("restore failure");
      }
      values.AKS_ACCESS_REGISTRY = options.restoreRaw || initialRaw;
      delete values.AKS_ACCESS002_RECIPE_BACKUP;
      if (options.leaveTemporaryState) {
        values.AKS_ACCESS002_RECOVERY_BACKUP = "remaining";
      }
      return { revision: "rev-initial", exactRestore: true };
    }
  };

  return {
    calls: calls,
    values: values,
    initialRaw: initialRaw,
    rehearsal: AKS_createAccessRecoveryRehearsal_({
      baseRecipe: base,
      propertyStore: store
    })
  };
}

function AKS_testAccess002Recovery_preflightIsStrictlyReadOnly_() {
  var fixture = AKS_access002RecoveryFixture_();
  var before = fixture.values.AKS_ACCESS_REGISTRY;
  var result = fixture.rehearsal.preflight();
  assertEquals_("PREFLIGHT", result.phase);
  assertEquals_(false, result.writePerformed);
  assertEquals_(false, result.realRecoveryExecutable);
  assertEquals_(before, fixture.values.AKS_ACCESS_REGISTRY);
  assertTrue_(fixture.calls.indexOf("base:apply") === -1);
  assertTrue_(fixture.calls.indexOf("base:restore") === -1);
}

function AKS_testAccess002Recovery_restoresAccess11RawExactly_() {
  var fixture = AKS_access002RecoveryFixture_();
  var result = fixture.rehearsal.runReversible();
  assertEquals_("RESTORED", result.phase);
  assertEquals_("access/1.1", result.initialSchemaVersion);
  assertEquals_(true, result.exactRestore);
  assertEquals_(fixture.initialRaw, fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(false, result.realRecoveryExecuted);
}

function AKS_testAccess002Recovery_removesTemporaryProperties_() {
  var fixture = AKS_access002RecoveryFixture_();
  var result = fixture.rehearsal.runReversible();
  assertEquals_(true, result.temporaryStateRemoved);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECOVERY_BACKUP);
}

function AKS_testAccess002Recovery_autoRestoresAfterApplyFailure_() {
  var fixture = AKS_access002RecoveryFixture_({ failApply: true });
  assertThrows_(function () {
    fixture.rehearsal.runReversible();
  });
  assertEquals_(fixture.initialRaw, fixture.values.AKS_ACCESS_REGISTRY);
  assertTrue_(fixture.calls.indexOf("base:restore") !== -1);
}

function AKS_testAccess002Recovery_refusesInexactRestore_() {
  var fixture = AKS_access002RecoveryFixture_({
    restoreRaw: JSON.stringify({
      schemaVersion: "access/1.2",
      revision: "rev-other",
      accounts: []
    })
  });
  assertThrows_(function () {
    fixture.rehearsal.runReversible();
  }, "ACCESS_RECOVERY_REHEARSAL_EXACT_RESTORE_FAILED");
}

function AKS_testAccess002Recovery_exposesNonExecutableRealProcedure_() {
  var fixture = AKS_access002RecoveryFixture_();
  var procedure = fixture.rehearsal.getExceptionalRecoveryProcedure();
  assertEquals_(false, procedure.executable);
  assertEquals_(false, procedure.access00206ExecutionAllowed);
  assertEquals_(true, procedure.requiresEnhancedAuthorization);
  assertEquals_(true, procedure.retentionRequiresFinalConfirmation);
  assertEquals_(undefined, fixture.rehearsal.applyRealRecovery);
  assertTrue_(Object.isFrozen(procedure) && Object.isFrozen(procedure.steps));
}

function AKS_runAccess002RecoveryRehearsalSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-06 — récupération réversible", [
    { name: "précontrôle sans écriture", test: AKS_testAccess002Recovery_preflightIsStrictlyReadOnly_ },
    { name: "restauration brute access/1.1 exacte", test: AKS_testAccess002Recovery_restoresAccess11RawExactly_ },
    { name: "propriétés temporaires supprimées", test: AKS_testAccess002Recovery_removesTemporaryProperties_ },
    { name: "échec applicatif auto-restauré", test: AKS_testAccess002Recovery_autoRestoresAfterApplyFailure_ },
    { name: "restauration inexacte refusée", test: AKS_testAccess002Recovery_refusesInexactRestore_ },
    { name: "récupération réelle non exécutable", test: AKS_testAccess002Recovery_exposesNonExecutableRealProcedure_ }
  ]);
}
