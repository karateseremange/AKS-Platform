var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the editor-only ACCESS-002-02 reversible recipe.
 *
 * Runtime values are read from Script Properties. No Web App route exposes
 * these operations, and no production identity or project id is embedded.
 */
function AKS_createAccess002Recipe_(ports) {
  "use strict";

  ports = ports || {};
  var propertyStore = ports.propertyStore;
  var scriptIdProvider = ports.scriptIdProvider;
  var resolveActor = ports.resolveActor;
  var authorizeActor = ports.authorizeActor;
  var createAccessService = ports.createAccessService;
  var audit = ports.audit;
  var lock = ports.lock;
  var clock = ports.clock || function () { return new Date(); };
  var idProvider = ports.idProvider;
  var REGISTRY_KEY = "AKS_ACCESS_REGISTRY";
  var BACKUP_KEY = "AKS_ACCESS002_RECIPE_BACKUP";
  var ENVIRONMENT_KEY = "AKS_ACCESS002_RECIPE_ENVIRONMENT";
  var SCRIPT_ID_KEY = "AKS_ACCESS002_RECIPE_EXPECTED_SCRIPT_ID";
  var MANAGER_KEY = "AKS_ACCESS002_RECIPE_MANAGER_EMAIL";
  var DENIED_KEY = "AKS_ACCESS002_RECIPE_DENIED_EMAIL";
  var LOCK_TIMEOUT_MS = 30000;

  function failure_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function assertDependencies_() {
    if (!propertyStore || typeof propertyStore.getProperty !== "function" ||
        typeof propertyStore.setProperty !== "function" ||
        typeof propertyStore.deleteProperty !== "function" ||
        typeof scriptIdProvider !== "function" ||
        typeof resolveActor !== "function" || typeof authorizeActor !== "function" ||
        typeof createAccessService !== "function" || typeof idProvider !== "function" ||
        !lock || typeof lock.tryLock !== "function" ||
        typeof lock.releaseLock !== "function") {
      throw failure_("ACCESS_RECIPE_UNAVAILABLE", "La recette ACCESS-002-02 est indisponible.");
    }
  }

  function normalizeEmail_(value) {
    return String(value || "").trim().toLowerCase();
  }

  function validEmail_(value) {
    return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function maskedEmail_(email) {
    var parts = email.split("@");
    return parts[0].slice(0, 1) + "***@" + parts[1];
  }

  function suffix_(value) {
    value = String(value || "");
    return value.slice(Math.max(0, value.length - 6));
  }

  function nowIso_() {
    var instant = clock();
    if (!(instant instanceof Date) || isNaN(instant.getTime())) {
      throw failure_("ACCESS_RECIPE_CLOCK_INVALID", "L'horodatage de recette est invalide.");
    }
    return instant.toISOString();
  }

  function settings_() {
    var actualScriptId = String(scriptIdProvider() || "");
    var expectedScriptId = String(propertyStore.getProperty(SCRIPT_ID_KEY) || "");
    var environment = String(propertyStore.getProperty(ENVIRONMENT_KEY) || "").trim();
    var manager = normalizeEmail_(propertyStore.getProperty(MANAGER_KEY));
    var denied = normalizeEmail_(propertyStore.getProperty(DENIED_KEY));
    if (environment !== "RECETTE" || !/^[A-Za-z0-9_-]{20,128}$/.test(expectedScriptId) ||
        actualScriptId !== expectedScriptId) {
      throw failure_("ACCESS_RECIPE_TARGET_REFUSED", "La cible Apps Script de recette n'est pas confirmée.");
    }
    if (!validEmail_(manager) || !validEmail_(denied) || manager === denied) {
      throw failure_("ACCESS_RECIPE_IDENTITIES_INVALID", "Les identités de recette sont absentes ou invalides.");
    }
    return {
      actualScriptId: actualScriptId,
      manager: manager,
      denied: denied
    };
  }

  function actor_() {
    var actor = normalizeEmail_(resolveActor());
    if (!validEmail_(actor)) {
      throw failure_("ACCESS_RECIPE_ACCESS_DENIED", "Le compte Google actif est introuvable.");
    }
    try {
      if (normalizeEmail_(authorizeActor(actor)) !== actor) throw new Error("denied");
    } catch (ignored) {
      throw failure_("ACCESS_RECIPE_ACCESS_DENIED", "Le compte actif n'est pas autorisé pour cette recette.");
    }
    return actor;
  }

  function rawRegistry_() {
    var raw = propertyStore.getProperty(REGISTRY_KEY);
    return raw === null || typeof raw === "undefined" || raw === "" ? null : String(raw);
  }

  function readBackup_() {
    var serialized = propertyStore.getProperty(BACKUP_KEY);
    if (!serialized) return null;
    try {
      var backup = JSON.parse(serialized);
      if (!backup || backup.schemaVersion !== "access-recipe-backup/1.0" ||
          typeof backup.beforeRevision !== "string" ||
          !Object.prototype.hasOwnProperty.call(backup, "beforeRaw")) {
        throw new Error("invalid");
      }
      return backup;
    } catch (failure) {
      throw failure_("ACCESS_RECIPE_BACKUP_INVALID", "La sauvegarde ACCESS de recette est invalide.");
    }
  }

  function writeVerifiedBackup_(backup) {
    var serialized = JSON.stringify(backup);
    propertyStore.setProperty(BACKUP_KEY, serialized);
    if (propertyStore.getProperty(BACKUP_KEY) !== serialized) {
      throw failure_("ACCESS_RECIPE_BACKUP_FAILED", "La sauvegarde ACCESS de recette n'a pas été vérifiée.");
    }
  }

  function publicResult_(settings, actor, details) {
    var result = {
      ok: true,
      environment: "RECETTE",
      scriptIdSuffix: suffix_(settings.actualScriptId),
      actor: maskedEmail_(actor),
      manager: maskedEmail_(settings.manager),
      deniedIdentity: maskedEmail_(settings.denied)
    };
    Object.keys(details || {}).forEach(function (key) { result[key] = details[key]; });
    return Object.freeze(result);
  }

  function hasExplicitManage_(account) {
    return account && account.status === "ACTIVE" &&
      account.assignments.some(function (assignment) {
        return assignment.module === "ACCESS" && assignment.status === "ACTIVE" &&
          assignment.extraCapabilities.indexOf("ACCESS_MANAGE") !== -1 &&
          assignment.roles.some(function (role) {
            return account.roles.indexOf(role) !== -1;
          });
      });
  }

  function targetRegistry_(view, settings) {
    var target = {
      schemaVersion: view.schemaVersion,
      accounts: JSON.parse(JSON.stringify(view.accounts))
    };
    var denied = target.accounts.filter(function (account) {
      return account.email === settings.denied;
    })[0];
    if (denied && (denied.roles.indexOf("ADMINISTRATEUR") !== -1 ||
        hasExplicitManage_(denied))) {
      throw failure_("ACCESS_RECIPE_DENIED_IDENTITY_PRIVILEGED", "L'identité de refus est déjà gestionnaire.");
    }
    var manager = target.accounts.filter(function (account) {
      return account.email === settings.manager;
    })[0];
    if (!manager) {
      manager = {
        email: settings.manager,
        displayName: "Gestionnaire recette",
        status: "ACTIVE",
        roles: ["ADMINISTRATEUR"],
        assignments: []
      };
      target.accounts.push(manager);
    } else if (manager.status !== "ACTIVE") {
      throw failure_("ACCESS_RECIPE_MANAGER_INACTIVE", "Le gestionnaire de recette existe mais n'est pas actif.");
    }
    if (manager.roles.indexOf("ADMINISTRATEUR") === -1) manager.roles.push("ADMINISTRATEUR");
    if (!hasExplicitManage_(manager)) {
      manager.assignments.push({
        module: "ACCESS", section: "", courseCode: "", season: "*",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
      });
    }
    return target;
  }

  function assertPersistentAudit_() {
    if (!audit || typeof audit.recordUnderExistingLock !== "function" ||
        typeof audit.isPersistentRecipeAudit !== "function" ||
        audit.isPersistentRecipeAudit() !== true) {
      throw failure_("ACCESS_RECIPE_AUDIT_REQUIRED",
        "L\'audit persistant de recette est indisponible.");
    }
  }

  function preflight() {
    assertDependencies_();
    var settings = settings_();
    var actor = actor_();
    assertPersistentAudit_();
    var backup = readBackup_();
    if (backup) {
      throw failure_("ACCESS_RECIPE_RECOVERY_REQUIRED", "Une sauvegarde de recette doit être restaurée avant une nouvelle exécution.");
    }
    var view = createAccessService(actor).readRegistryForAdministration();
    var target = targetRegistry_(view, settings);
    return publicResult_(settings, actor, {
      phase: "PREFLIGHT",
      registryRevision: view.revision,
      bootstrap: view.bootstrap === true,
      accountCountBefore: view.accounts.length,
      accountCountProposed: target.accounts.length,
      writePerformed: false
    });
  }

  function restoreRaw_(raw) {
    if (raw === null) propertyStore.deleteProperty(REGISTRY_KEY);
    else propertyStore.setProperty(REGISTRY_KEY, raw);
    if (rawRegistry_() !== raw) {
      throw failure_("ACCESS_RECIPE_RESTORE_FAILED", "La restauration exacte du registre de recette a échoué.");
    }
  }

  function verifyDecision_(settings) {
    createAccessService(settings.manager).assertAdministrativeCapability("ACCESS_MANAGE");
    try {
      createAccessService(settings.denied).assertAdministrativeCapability("ACCESS_MANAGE");
    } catch (failure) {
      if (failure && (failure.code === "ACCESS_DENIED" ||
          failure.code === "ACCESS_CAPABILITY_DENIED")) return;
      throw failure;
    }
    throw failure_("ACCESS_RECIPE_DENIAL_FAILED", "L'identité non habilitée n'a pas été refusée.");
  }

  function apply() {
    assertDependencies_();
    var settings = settings_();
    var actor = actor_();
    var lockHeld = false;
    try {
      if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
        throw failure_("ACCESS_RECIPE_LOCK_UNAVAILABLE", "Le registre de recette est momentanément indisponible.");
      }
      lockHeld = true;
      var existingBackup = readBackup_();
      if (existingBackup) {
        var currentView = createAccessService(settings.manager, true)
          .readRegistryForAdministration();
        if (existingBackup.afterRevision &&
            currentView.revision === existingBackup.afterRevision &&
            rawRegistry_() === existingBackup.afterRaw) {
          verifyDecision_(settings);
          return publicResult_(settings, actor, {
            phase: "APPLIED", revision: currentView.revision,
            correlationId: existingBackup.correlationId, alreadyApplied: true
          });
        }
        throw failure_("ACCESS_RECIPE_RECOVERY_REQUIRED", "La sauvegarde existante impose une restauration contrôlée.");
      }
      var service = createAccessService(actor, true);
      var before = service.readRegistryForAdministration();
      var target = targetRegistry_(before, settings);
      var backup = {
        schemaVersion: "access-recipe-backup/1.0",
        scriptId: settings.actualScriptId,
        actor: actor,
        manager: settings.manager,
        denied: settings.denied,
        createdAt: nowIso_(),
        beforeRevision: before.revision,
        beforeRaw: rawRegistry_(),
        afterRevision: "",
        afterRaw: null,
        correlationId: ""
      };
      writeVerifiedBackup_(backup);
      var result;
      try {
        result = service.updateRegistryForAdministration({
          expectedRevision: before.revision,
          registry: target
        });
        backup.afterRevision = result.revision;
        backup.afterRaw = rawRegistry_();
        backup.correlationId = result.correlationId;
        writeVerifiedBackup_(backup);
        verifyDecision_(settings);
      } catch (recipeFailure) {
        if (rawRegistry_() !== backup.beforeRaw) restoreRaw_(backup.beforeRaw);
        propertyStore.deleteProperty(BACKUP_KEY);
        throw recipeFailure;
      }
      return publicResult_(settings, actor, {
        phase: "APPLIED",
        beforeRevision: before.revision,
        revision: result.revision,
        correlationId: result.correlationId,
        managerAccess: true,
        deniedAccess: false,
        backupVerified: true,
        alreadyApplied: false
      });
    } finally {
      if (lockHeld) lock.releaseLock();
    }
  }

  function auditEvent_(actor, backup, result, afterRevision, correlationId) {
    return {
      actorType: "ADMIN", actor: actor, action: "ACCESS_REGISTRY_UPDATE",
      module: "ACCESS", criticality: "CRITICAL",
      targetType: "ACCESS_REGISTRY", targetId: "AKS_ACCESS_REGISTRY",
      result: result, reasonCode: "",
      correlationId: correlationId,
      metadata: {
        beforeRevision: backup.afterRevision,
        proposedRevision: backup.beforeRevision,
        afterRevision: afterRevision,
        changedAccountIds: [backup.manager], changedCount: 1,
        selfModification: backup.manager === actor, restored: true
      }
    };
  }

  function restore() {
    assertDependencies_();
    var settings = settings_();
    var actor = actor_();
    var backup = readBackup_();
    if (!backup || backup.scriptId !== settings.actualScriptId ||
        backup.manager !== settings.manager || backup.denied !== settings.denied ||
        !backup.afterRevision || !Object.prototype.hasOwnProperty.call(backup, "afterRaw")) {
      throw failure_("ACCESS_RECIPE_BACKUP_INVALID", "Aucune sauvegarde applicable à cette recette n'est disponible.");
    }
    var lockHeld = false;
    try {
      if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
        throw failure_("ACCESS_RECIPE_LOCK_UNAVAILABLE", "Le registre de recette est momentanément indisponible.");
      }
      lockHeld = true;
      var current = createAccessService(settings.manager).readRegistryForAdministration();
      if (rawRegistry_() === backup.beforeRaw && current.revision === backup.beforeRevision) {
        propertyStore.deleteProperty(BACKUP_KEY);
        return publicResult_(settings, actor, {
          phase: "RESTORED", revision: current.revision, alreadyRestored: true
        });
      }
      if (current.revision !== backup.afterRevision || rawRegistry_() !== backup.afterRaw) {
        throw failure_("ACCESS_RECIPE_RESTORE_CONFLICT", "Le registre a changé depuis l'application de la recette.");
      }
      if (!audit || typeof audit.recordUnderExistingLock !== "function" ||
          typeof audit.isPersistentRecipeAudit !== "function" ||
          audit.isPersistentRecipeAudit() !== true) {
        throw failure_("ACCESS_RECIPE_AUDIT_REQUIRED", "L'audit persistant de recette est indisponible.");
      }
      var restoreCorrelationId = "corr-access002-restore-" +
        String(idProvider()).replace(/[^A-Za-z0-9._:-]/g, "-");
      var intention = auditEvent_(
        actor, backup, "INTENTION", backup.beforeRevision, restoreCorrelationId);
      audit.recordUnderExistingLock(intention);
      restoreRaw_(backup.beforeRaw);
      try {
        audit.recordUnderExistingLock(auditEvent_(
          actor, backup, "REUSSI", backup.beforeRevision, restoreCorrelationId));
      } catch (auditFailure) {
        restoreRaw_(backup.afterRaw);
        throw failure_("ACCESS_RECIPE_AUDIT_REQUIRED", "La preuve finale de restauration est indisponible.");
      }
      propertyStore.deleteProperty(BACKUP_KEY);
      if (propertyStore.getProperty(BACKUP_KEY)) {
        throw failure_("ACCESS_RECIPE_BACKUP_CLEANUP_FAILED", "La sauvegarde temporaire n'a pas été supprimée.");
      }
      return publicResult_(settings, actor, {
        phase: "RESTORED", revision: backup.beforeRevision,
        correlationId: intention.correlation_id || intention.correlationId || "",
        exactRestore: true, backupRemoved: true, alreadyRestored: false
      });
    } finally {
      if (lockHeld) lock.releaseLock();
    }
  }

  assertDependencies_();
  return Object.freeze({ preflight: preflight, apply: apply, restore: restore });
}

function AKS_createDefaultAccess002Recipe_() {
  var propertyStore = PropertiesService.getScriptProperties();
  function identityService_(identity, lockAlreadyHeld) {
    return AKS_createAccessService_({
      identityProvider: function () { return identity; },
      registryStore: AKS_createAccessRegistryStore_(propertyStore),
      registryLock: lockAlreadyHeld ? {
        tryLock: function () { return true; },
        releaseLock: function () {}
      } : LockService.getScriptLock()
    });
  }
  return AKS_createAccess002Recipe_({
    propertyStore: propertyStore,
    scriptIdProvider: function () { return ScriptApp.getScriptId(); },
    resolveActor: function () { return Session.getActiveUser().getEmail(); },
    authorizeActor: function (actor) {
      try { return AKS.Admin.Access.assertAuthorized(actor); } catch (ignored) {}
      identityService_(actor).assertAdministrativeCapability("ACCESS_MANAGE");
      return actor;
    },
    createAccessService: identityService_,
    audit: AKS.Core.Audit,
    lock: LockService.getScriptLock(),
    idProvider: function () { return Utilities.getUuid(); }
  });
}

/** Editor-only and read-only: validates target, identities and proposed change. */
function AKS_preflightAccess002Recipe() {
  var result = AKS_createDefaultAccess002Recipe_().preflight();
  console.log("PRÉCONTRÔLE RECETTE ACCESS-002-02: " + JSON.stringify(result));
  return result;
}

/** Editor-only: requires separate authorization before it mutates the recipe registry. */
function AKS_applyAccess002Recipe() {
  var result = AKS_createDefaultAccess002Recipe_().apply();
  console.log("APPLICATION RECETTE ACCESS-002-02: " + JSON.stringify(result));
  return result;
}

/** Editor-only: restores the exact serialized registry saved before apply. */
function AKS_restoreAccess002Recipe() {
  var result = AKS_createDefaultAccess002Recipe_().restore();
  console.log("RESTAURATION RECETTE ACCESS-002-02: " + JSON.stringify(result));
  return result;
}
