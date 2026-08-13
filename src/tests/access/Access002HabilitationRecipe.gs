var AKS = AKS || {};

/** ACCESS-002-04 reversible detail, save and functional history recipe. */
function AKS_createAccess002HabilitationRecipe_(ports) {
  "use strict";
  ports = ports || {};
  var baseRecipe = ports.baseRecipe;
  var propertyStore = ports.propertyStore;
  var detailFactory = ports.detailFactory;
  var historyFactory = ports.historyFactory;
  var idProvider = ports.idProvider;
  var BACKUP_KEY = "AKS_ACCESS002_RECIPE_BACKUP";
  var COMMENT = "Recette réversible ACCESS-002-04";

  function failure_(code, message) {
    var error = new Error(message); error.code = code; return error;
  }
  if (!baseRecipe || typeof baseRecipe.preflight !== "function" ||
      typeof baseRecipe.apply !== "function" || typeof baseRecipe.restore !== "function" ||
      !propertyStore || typeof propertyStore.getProperty !== "function" ||
      typeof propertyStore.setProperty !== "function" ||
      typeof detailFactory !== "function" || typeof historyFactory !== "function" ||
      typeof idProvider !== "function") {
    throw failure_("ACCESS_HABILITATION_RECIPE_UNAVAILABLE",
      "La recette ACCESS-002-04 est indisponible.");
  }
  function backup_() {
    var parsed;
    try { parsed = JSON.parse(propertyStore.getProperty(BACKUP_KEY) || ""); }
    catch (ignored) {}
    if (!parsed || parsed.schemaVersion !== "access-recipe-backup/1.0" ||
        !parsed.manager) {
      throw failure_("ACCESS_HABILITATION_RECIPE_BACKUP_INVALID",
        "La sauvegarde réversible ACCESS est indisponible.");
    }
    return parsed;
  }
  function advanceBackup_(result, manager) {
    var backup = backup_();
    backup.afterRevision = result.revision;
    backup.afterRaw = propertyStore.getProperty("AKS_ACCESS_REGISTRY");
    backup.changedAccountIds = [manager];
    propertyStore.setProperty(BACKUP_KEY, JSON.stringify(backup));
  }
  function analyticsAssignment_() {
    return {
      module: "ANALYTICS", season: "*", section: "", courseCode: "",
      status: "ACTIVE", roles: ["ADMINISTRATEUR"],
      capabilities: ["ANALYTICS_READ"], validFrom: "", validUntil: ""
    };
  }
  function preflight() {
    var base = baseRecipe.preflight();
    return Object.freeze({
      ok: true, phase: "PREFLIGHT", environment: base.environment,
      scriptIdSuffix: base.scriptIdSuffix, registryRevision: base.registryRevision,
      rolesProposed: ["ADMINISTRATEUR", "CONSULTATION"],
      analyticsCapabilityProposed: "ANALYTICS_READ", writePerformed: false
    });
  }
  function apply() {
    var base = baseRecipe.apply();
    var manager = backup_().manager;
    var detail = detailFactory(manager);
    try {
      var before = detail.getAccountDetail(manager);
      var assignments = before.account.assignments.map(function (entry) {
        return JSON.parse(JSON.stringify(entry));
      });
      assignments.push(analyticsAssignment_());
      var saved = detail.saveAccountAccess({
        accountId: manager, expectedRevision: base.revision,
        requestId: "req-access00204-" +
          String(idProvider()).replace(/[^A-Za-z0-9._:-]/g, "-"),
        roles: ["ADMINISTRATEUR", "CONSULTATION"], assignments: assignments,
        comment: COMMENT, confirmSensitive: true
      });
      advanceBackup_(saved, manager);
      var verified = detail.getAccountDetail(manager);
      var analytics = verified.account.assignments.filter(function (entry) {
        return entry.module === "ANALYTICS" &&
          entry.capabilities.indexOf("ANALYTICS_READ") !== -1;
      });
      var history = historyFactory(manager).getAccountHistory(manager, "");
      var proof = history.entries.filter(function (entry) {
        return entry.operation === "SAVE_ACCOUNT_ACCESS" && entry.comment === COMMENT &&
          entry.summary.rolesAdded.indexOf("CONSULTATION") !== -1 &&
          entry.summary.assignmentsAdded === 1;
      });
      if (verified.schemaVersion !== "access/1.1" || analytics.length !== 1 ||
          verified.account.roles.indexOf("CONSULTATION") === -1 || proof.length < 1) {
        throw failure_("ACCESS_HABILITATION_RECIPE_VERIFICATION_FAILED",
          "La fiche ou son historique fonctionnel n'est pas vérifié.");
      }
      return Object.freeze({
        ok: true, phase: "APPLIED", revision: saved.revision,
        managerSuffix: manager.slice(-6), schemaVersion: verified.schemaVersion,
        multiRoleVerified: true, analyticsReadVerified: true,
        historyVerified: true, actorMasked: proof[0].actor,
        backupVerified: true
      });
    } catch (error) {
      try { baseRecipe.restore(); } catch (restoreFailure) {
        throw failure_("ACCESS_HABILITATION_RECIPE_RECOVERY_REQUIRED",
          "La recette a échoué et exige une restauration contrôlée.");
      }
      throw error;
    }
  }
  function restore() {
    var result = baseRecipe.restore();
    return Object.freeze({
      ok: true, phase: "RESTORED", revision: result.revision,
      exactRestore: result.exactRestore === true || result.alreadyRestored === true,
      backupRemoved: result.backupRemoved === true || result.alreadyRestored === true
    });
  }
  return Object.freeze({ preflight: preflight, apply: apply, restore: restore });
}

function AKS_createDefaultAccess002HabilitationRecipe_() {
  var propertyStore = PropertiesService.getScriptProperties();
  function accessService_(identity) {
    return AKS_createAccessService_({
      identityProvider: function () { return identity; },
      registryStore: AKS_createAccessRegistryStore_(propertyStore)
    });
  }
  function admin_(identity) {
    return AKS.Core.AccessAdmin.create({ accessService: accessService_(identity) });
  }
  return AKS_createAccess002HabilitationRecipe_({
    baseRecipe: AKS_createDefaultAccess002Recipe_(), propertyStore: propertyStore,
    detailFactory: function (identity) {
      return AKS.Core.AccessAccountDetail.create({ accessAdmin: admin_(identity) });
    },
    historyFactory: function (identity) {
      var registry = AKS_createPlatformParameterRegistry_();
      var configuration = AKS_createConfigurationService_(
        registry, AKS_createScriptParameterValueStore_());
      return AKS.Core.AccessAccountHistory.create({
        accessService: accessService_(identity),
        gateway: AKS_createConfiguredAuditSheetsGateway_(
          configuration.resolve("audit.spreadsheetId").value),
        catalogs: AKS_getAuditCatalogs_()
      });
    },
    idProvider: function () { return Utilities.getUuid(); }
  });
}

function AKS_preflightAccess002HabilitationRecipe() {
  var result = AKS_createDefaultAccess002HabilitationRecipe_().preflight();
  console.log("PRÉCONTRÔLE RECETTE ACCESS-002-04: " + JSON.stringify(result));
  return result;
}
function AKS_applyAccess002HabilitationRecipe() {
  var result = AKS_createDefaultAccess002HabilitationRecipe_().apply();
  console.log("APPLICATION RECETTE ACCESS-002-04: " + JSON.stringify(result));
  return result;
}
function AKS_restoreAccess002HabilitationRecipe() {
  var result = AKS_createDefaultAccess002HabilitationRecipe_().restore();
  console.log("RESTAURATION RECETTE ACCESS-002-04: " + JSON.stringify(result));
  return result;
}
