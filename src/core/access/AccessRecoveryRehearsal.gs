var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ACCESS-002-06 reversible recovery rehearsal.
 *
 * This component deliberately exposes no operation that can retain a recovered
 * registry. A real exceptional recovery remains a documented, separately
 * authorized operational procedure.
 */
function AKS_createAccessRecoveryRehearsal_(ports) {
  "use strict";
  ports = ports || {};
  var baseRecipe = ports.baseRecipe;
  var propertyStore = ports.propertyStore;
  var REGISTRY_KEY = "AKS_ACCESS_REGISTRY";
  var TEMPORARY_KEYS = [
    "AKS_ACCESS002_RECIPE_BACKUP",
    "AKS_ACCESS002_RECOVERY_BACKUP"
  ];

  function failure_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  if (!baseRecipe ||
      typeof baseRecipe.preflight !== "function" ||
      typeof baseRecipe.apply !== "function" ||
      typeof baseRecipe.restore !== "function" ||
      !propertyStore ||
      typeof propertyStore.getProperty !== "function" ||
      typeof propertyStore.deleteProperty !== "function") {
    throw failure_(
      "ACCESS_RECOVERY_REHEARSAL_UNAVAILABLE",
      "La recette de récupération ACCESS est indisponible."
    );
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function schemaVersion_(raw) {
    if (raw === null || typeof raw === "undefined" || raw === "") {
      return null;
    }
    try {
      return JSON.parse(raw).schemaVersion || null;
    } catch (ignoredInvalidRegistry) {
      return "INVALID";
    }
  }

  function temporaryKeysPresent_() {
    return TEMPORARY_KEYS.filter(function (key) {
      return propertyStore.getProperty(key) !== null;
    });
  }

  function preflight() {
    var rawBefore = propertyStore.getProperty(REGISTRY_KEY);
    var base;
    try {
      base = baseRecipe.preflight();
    } catch (error) {
      if (error && error.code === "ACCESS_RECIPE_AUDIT_REQUIRED") {
        return freeze_({
          ok: false,
          phase: "PREFLIGHT",
          blocker: "PERSISTENT_AUDIT_REQUIRED",
          initialSchemaVersion: schemaVersion_(rawBefore),
          writePerformed: false,
          realRecoveryExecutable: false,
          restorationRequired: true
        });
      }
      throw error;
    }
    return freeze_({
      ok: true,
      phase: "PREFLIGHT",
      environment: base.environment,
      scriptIdSuffix: base.scriptIdSuffix,
      registryRevision: base.registryRevision || null,
      initialSchemaVersion: schemaVersion_(rawBefore),
      writePerformed: false,
      realRecoveryExecutable: false,
      restorationRequired: true
    });
  }

  function runReversible() {
    var preview = preflight();
    var rawBefore = propertyStore.getProperty(REGISTRY_KEY);
    var applyResult = null;
    var primaryFailure = null;
    var restoreResult = null;

    try {
      applyResult = baseRecipe.apply();
      if (propertyStore.getProperty(REGISTRY_KEY) === rawBefore) {
        throw failure_(
          "ACCESS_RECOVERY_REHEARSAL_NOT_APPLIED",
          "La mutation temporaire de récupération n'a pas été vérifiée."
        );
      }
    } catch (error) {
      primaryFailure = error;
    }

    try {
      restoreResult = baseRecipe.restore();
    } catch (restoreFailure) {
      throw failure_(
        "ACCESS_RECOVERY_REHEARSAL_RESTORE_FAILED",
        "La restauration contrôlée du registre ACCESS a échoué."
      );
    }

    var rawAfter = propertyStore.getProperty(REGISTRY_KEY);
    if (rawAfter !== rawBefore) {
      throw failure_(
        "ACCESS_RECOVERY_REHEARSAL_EXACT_RESTORE_FAILED",
        "Le registre ACCESS initial n'a pas été restauré à l'identique."
      );
    }

    var remainingKeys = temporaryKeysPresent_();
    if (remainingKeys.length) {
      throw failure_(
        "ACCESS_RECOVERY_REHEARSAL_TEMPORARY_STATE_REMAINS",
        "Des propriétés temporaires de récupération subsistent."
      );
    }

    if (primaryFailure) {
      throw primaryFailure;
    }

    return freeze_({
      ok: true,
      phase: "RESTORED",
      initialSchemaVersion: preview.initialSchemaVersion,
      appliedRevision: applyResult && applyResult.revision || null,
      restoredRevision: restoreResult && restoreResult.revision || null,
      exactRestore: true,
      temporaryStateRemoved: true,
      realRecoveryExecuted: false
    });
  }

  function getExceptionalRecoveryProcedure() {
    return freeze_({
      schemaVersion: "access-recovery-procedure/1.0",
      executable: false,
      requiresEnhancedAuthorization: true,
      steps: [
        "PREFLIGHT_WITHOUT_WRITE",
        "AUTHORIZE_EXCEPTIONALLY",
        "BACKUP_EXACT_REGISTRY",
        "APPLY_MINIMAL_RECOVERY",
        "WRITE_PERSISTENT_AUDIT_PROOF",
        "VERIFY_MANAGER_ACCESS",
        "VERIFY_RESULTING_REGISTRY",
        "CONFIRM_OR_RESTORE"
      ],
      retentionRequiresFinalConfirmation: true,
      access00206ExecutionAllowed: false
    });
  }

  return Object.freeze({
    preflight: preflight,
    runReversible: runReversible,
    getExceptionalRecoveryProcedure: getExceptionalRecoveryProcedure
  });
}

function AKS_createDefaultAccessRecoveryRehearsal_() {
  return AKS_createAccessRecoveryRehearsal_({
    baseRecipe: AKS_createDefaultAccess002Recipe_(),
    propertyStore: PropertiesService.getScriptProperties()
  });
}

function AKS_preflightAccess002RecoveryRehearsal() {
  var result = AKS_createDefaultAccessRecoveryRehearsal_().preflight();
  console.log("PRÉCONTRÔLE RÉCUPÉRATION ACCESS-002-06: " + JSON.stringify(result));
  return result;
}

function AKS_runAccess002RecoveryReversibleRehearsal() {
  var result = AKS_createDefaultAccessRecoveryRehearsal_().runReversible();
  console.log("RECETTE RÉVERSIBLE RÉCUPÉRATION ACCESS-002-06: " +
    JSON.stringify(result));
  return result;
}
