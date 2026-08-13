var AKS = AKS || {};

/** ACCESS-002-03 reversible lifecycle recipe layered on ACCESS-002-02. */
function AKS_createAccess002AccountRecipe_(ports) {
  "use strict";
  ports = ports || {};
  var baseRecipe = ports.baseRecipe;
  var propertyStore = ports.propertyStore;
  var lifecycleFactory = ports.lifecycleFactory;
  var projectionFactory = ports.projectionFactory;
  var idProvider = ports.idProvider;
  var ACCOUNT_KEY = "AKS_ACCESS00203_RECIPE_ACCOUNT_EMAIL";
  var BACKUP_KEY = "AKS_ACCESS002_RECIPE_BACKUP";

  function failure_(code, message) {
    var error = new Error(message); error.code = code; return error;
  }

  if (!baseRecipe || typeof baseRecipe.preflight !== "function" ||
      typeof baseRecipe.apply !== "function" || typeof baseRecipe.restore !== "function" ||
      !propertyStore || typeof propertyStore.getProperty !== "function" ||
      typeof propertyStore.setProperty !== "function" ||
      typeof lifecycleFactory !== "function" || typeof projectionFactory !== "function" ||
      typeof idProvider !== "function") {
    throw failure_("ACCESS_ACCOUNT_RECIPE_UNAVAILABLE",
      "La recette ACCESS-002-03 est indisponible.");
  }

  function accountId_() {
    var value = String(propertyStore.getProperty(ACCOUNT_KEY) || "").trim().toLowerCase();
    if (!value || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw failure_("ACCESS_ACCOUNT_RECIPE_IDENTITY_INVALID",
        "L'identité de compte ACCESS-002-03 est absente ou invalide.");
    }
    return value;
  }

  function backup_() {
    var raw = propertyStore.getProperty(BACKUP_KEY), parsed;
    try { parsed = JSON.parse(raw || ""); } catch (ignored) {}
    if (!parsed || parsed.schemaVersion !== "access-recipe-backup/1.0") {
      throw failure_("ACCESS_ACCOUNT_RECIPE_BACKUP_INVALID",
        "La sauvegarde réversible ACCESS est indisponible.");
    }
    return parsed;
  }

  function advanceBackup_(result, accountId) {
    var backup = backup_();
    backup.afterRevision = result.revision;
    backup.afterRaw = propertyStore.getProperty("AKS_ACCESS_REGISTRY");
    backup.changedAccountIds = [backup.manager, accountId].sort();
    propertyStore.setProperty(BACKUP_KEY, JSON.stringify(backup));
  }

  function command_(revision, accountId, suffix) {
    return {
      accountId: accountId,
      expectedRevision: revision,
      requestId: "req-access00203-" + suffix + "-" +
        String(idProvider()).replace(/[^A-Za-z0-9._:-]/g, "-")
    };
  }

  function preflight() {
    var base = baseRecipe.preflight();
    var accountId = accountId_();
    var raw = propertyStore.getProperty("AKS_ACCESS_REGISTRY"), registry = null;
    try { registry = raw ? JSON.parse(raw) : null; } catch (ignoredInvalidRegistry) {}
    if (registry && Array.isArray(registry.accounts) &&
        registry.accounts.some(function (account) {
          return String(account.email || "").trim().toLowerCase() === accountId;
        })) {
      throw failure_("ACCESS_ACCOUNT_RECIPE_ACCOUNT_EXISTS",
        "Le compte de recette existe déjà.");
    }
    return Object.freeze({
      ok: true, phase: "PREFLIGHT", environment: base.environment,
      scriptIdSuffix: base.scriptIdSuffix, accountIdSuffix: accountId.slice(-6),
      registryRevision: base.registryRevision, writePerformed: false
    });
  }

  function apply() {
    var accountId = accountId_();
    var base = baseRecipe.apply();
    var manager = backup_().manager;
    var lifecycle = lifecycleFactory(manager);
    var revision = base.revision;
    try {
      var created = lifecycle.createAccount(Object.assign(
        command_(revision, accountId, "create"), {
          displayName: "Compte cycle de vie recette", role: "CONSULTATION"
        }));
      advanceBackup_(created, accountId); revision = created.revision;
      var activated = lifecycle.reactivateAccount(Object.assign(
        command_(revision, accountId, "activate"), { clearAssignments: true }));
      advanceBackup_(activated, accountId); revision = activated.revision;
      var deactivated = lifecycle.deactivateAccount(
        command_(revision, accountId, "deactivate"));
      advanceBackup_(deactivated, accountId); revision = deactivated.revision;
      var projected = projectionFactory(manager).listAccounts({ search: accountId });
      if (projected.resultCount !== 1 || projected.accounts[0].status !== "INACTIVE" ||
          projected.accounts[0].assignmentCount !== 0) {
        throw failure_("ACCESS_ACCOUNT_RECIPE_VERIFICATION_FAILED",
          "Le cycle de vie ACCESS-002-03 n'est pas vérifié.");
      }
      return Object.freeze({
        ok: true, phase: "APPLIED", revision: revision,
        accountIdSuffix: accountId.slice(-6), createdInactive: true,
        activatedWithoutAccess: true, deactivatedWithHistory: true,
        backupVerified: true
      });
    } catch (error) {
      try { baseRecipe.restore(); } catch (restoreFailure) {
        throw failure_("ACCESS_ACCOUNT_RECIPE_RECOVERY_REQUIRED",
          "Le cycle a échoué et exige une restauration contrôlée.");
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

function AKS_createDefaultAccess002AccountRecipe_() {
  var propertyStore = PropertiesService.getScriptProperties();
  function admin_(identity) {
    return AKS.Core.AccessAdmin.create({ accessService: AKS_createAccessService_({
      identityProvider: function () { return identity; },
      registryStore: AKS_createAccessRegistryStore_(propertyStore)
    }) });
  }
  return AKS_createAccess002AccountRecipe_({
    baseRecipe: AKS_createDefaultAccess002Recipe_(),
    propertyStore: propertyStore,
    lifecycleFactory: function (identity) {
      return AKS.Core.AccessAccountLifecycle.create({ accessAdmin: admin_(identity) });
    },
    projectionFactory: function (identity) {
      return AKS.Core.AccessAccountProjection.create({ accessAdmin: admin_(identity) });
    },
    idProvider: function () { return Utilities.getUuid(); }
  });
}

function AKS_preflightAccess002AccountRecipe() {
  var result = AKS_createDefaultAccess002AccountRecipe_().preflight();
  console.log("PRÉCONTRÔLE RECETTE ACCESS-002-03: " + JSON.stringify(result));
  return result;
}
function AKS_applyAccess002AccountRecipe() {
  var result = AKS_createDefaultAccess002AccountRecipe_().apply();
  console.log("APPLICATION RECETTE ACCESS-002-03: " + JSON.stringify(result));
  return result;
}
function AKS_restoreAccess002AccountRecipe() {
  var result = AKS_createDefaultAccess002AccountRecipe_().restore();
  console.log("RESTAURATION RECETTE ACCESS-002-03: " + JSON.stringify(result));
  return result;
}
