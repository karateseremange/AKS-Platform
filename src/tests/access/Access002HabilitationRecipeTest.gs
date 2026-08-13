function AKS_access002HabilitationRecipeFixture_(overrides) {
  overrides = overrides || {};
  var calls = [], values = { AKS_ACCESS_REGISTRY: "before" };
  var manager = "manager@example.com", revision = "rev-before";
  var account = { accountId: manager, status: "ACTIVE", roles: ["ADMINISTRATEUR"],
    assignments: [{ module: "ACCESS", season: "*", section: "", courseCode: "",
      status: "ACTIVE", roles: ["ADMINISTRATEUR"], capabilities: ["ACCESS_MANAGE"],
      validFrom: "", validUntil: "" }] };
  var base = {
    preflight: function () { calls.push("base:preflight"); return {
      environment: "RECETTE", scriptIdSuffix: "eIRxs4", registryRevision: revision
    }; },
    apply: function () {
      calls.push("base:apply"); revision = "rev-bootstrap";
      values.AKS_ACCESS_REGISTRY = "bootstrap";
      values.AKS_ACCESS002_RECIPE_BACKUP = JSON.stringify({
        schemaVersion: "access-recipe-backup/1.0", manager: manager,
        beforeRevision: "rev-before", beforeRaw: "before",
        afterRevision: revision, afterRaw: "bootstrap"
      });
      return { revision: revision };
    },
    restore: function () {
      calls.push("base:restore"); revision = "rev-before";
      values.AKS_ACCESS_REGISTRY = "before";
      delete values.AKS_ACCESS002_RECIPE_BACKUP;
      return { revision: revision, exactRestore: true, backupRemoved: true };
    }
  };
  var detail = {
    getAccountDetail: function () {
      calls.push("detail"); return { revision: revision, schemaVersion: "access/1.1",
        account: JSON.parse(JSON.stringify(account)) };
    },
    saveAccountAccess: function (command) {
      calls.push("save");
      if (overrides.failOnSave) throw new Error("save failure");
      account.roles = command.roles.slice();
      account.assignments = JSON.parse(JSON.stringify(command.assignments));
      revision = "rev-saved"; values.AKS_ACCESS_REGISTRY = "saved";
      return { revision: revision };
    }
  };
  var history = { getAccountHistory: function () {
    calls.push("history");
    return { entries: overrides.missingHistory ? [] : [{
      actor: "m***@example.com", operation: "SAVE_ACCOUNT_ACCESS",
      comment: "Recette réversible ACCESS-002-04",
      summary: { rolesAdded: ["CONSULTATION"], assignmentsAdded: 1 }
    }] };
  }};
  return {
    values: values, calls: calls,
    recipe: AKS_createAccess002HabilitationRecipe_({
      baseRecipe: base,
      propertyStore: {
        getProperty: function (key) { return values[key] || null; },
        setProperty: function (key, value) { calls.push("set:" + key); values[key] = value; }
      },
      detailFactory: function (identity) {
        assertEquals_(manager, identity); return detail;
      },
      historyFactory: function (identity) {
        assertEquals_(manager, identity); return history;
      },
      idProvider: function () { return "uuid"; }
    })
  };
}

function AKS_testAccess002HabilitationRecipe_preflightIsReadOnly_() {
  var fixture = AKS_access002HabilitationRecipeFixture_();
  var result = fixture.recipe.preflight();
  assertEquals_("PREFLIGHT", result.phase);
  assertEquals_(false, result.writePerformed);
  assertEquals_(JSON.stringify(["base:preflight"]), JSON.stringify(fixture.calls));
}

function AKS_testAccess002HabilitationRecipe_verifiesDetailAndHistory_() {
  var fixture = AKS_access002HabilitationRecipeFixture_();
  var result = fixture.recipe.apply();
  assertEquals_(true, result.multiRoleVerified);
  assertEquals_(true, result.analyticsReadVerified);
  assertEquals_(true, result.historyVerified);
  assertEquals_("m***@example.com", result.actorMasked);
  var backup = JSON.parse(fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertEquals_("rev-saved", backup.afterRevision);
  assertEquals_(JSON.stringify(["manager@example.com"]),
    JSON.stringify(backup.changedAccountIds));
}

function AKS_testAccess002HabilitationRecipe_restoresExactInitialState_() {
  var fixture = AKS_access002HabilitationRecipeFixture_();
  fixture.recipe.apply();
  var result = fixture.recipe.restore();
  assertEquals_(true, result.exactRestore);
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_testAccess002HabilitationRecipe_autoRestoresFailedSave_() {
  var fixture = AKS_access002HabilitationRecipeFixture_({ failOnSave: true });
  assertThrows_(function () { fixture.recipe.apply(); });
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
  assertTrue_(fixture.calls.indexOf("base:restore") !== -1);
}

function AKS_testAccess002HabilitationRecipe_autoRestoresMissingHistory_() {
  var fixture = AKS_access002HabilitationRecipeFixture_({ missingHistory: true });
  assertThrows_(function () { fixture.recipe.apply(); },
    "ACCESS_HABILITATION_RECIPE_VERIFICATION_FAILED");
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_runAccess002HabilitationRecipeSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-04 — recette habilitations", [
    { name: "précontrôle sans écriture", test: AKS_testAccess002HabilitationRecipe_preflightIsReadOnly_ },
    { name: "fiche et historique vérifiés", test: AKS_testAccess002HabilitationRecipe_verifiesDetailAndHistory_ },
    { name: "restauration exacte", test: AKS_testAccess002HabilitationRecipe_restoresExactInitialState_ },
    { name: "échec d'écriture auto-restauré", test: AKS_testAccess002HabilitationRecipe_autoRestoresFailedSave_ },
    { name: "historique absent auto-restauré", test: AKS_testAccess002HabilitationRecipe_autoRestoresMissingHistory_ }
  ]);
}
