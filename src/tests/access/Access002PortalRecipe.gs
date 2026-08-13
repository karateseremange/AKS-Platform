var AKS = AKS || {};

/** ACCESS-002-05 reversible multi-profile portal and My access recipe. */
function AKS_createAccess002PortalRecipe_(ports) {
  "use strict";
  ports = ports || {};
  var baseRecipe = ports.baseRecipe;
  var propertyStore = ports.propertyStore;
  var lifecycleFactory = ports.lifecycleFactory;
  var detailFactory = ports.detailFactory;
  var portalFactory = ports.portalFactory;
  var myAccessFactory = ports.myAccessFactory;
  var idProvider = ports.idProvider;
  var BACKUP_KEY = "AKS_ACCESS002_RECIPE_BACKUP";
  var PROFILE_KEYS = ["AKS_ACCESS00205_NO_ACCESS_EMAIL", "AKS_ACCESS00205_ATTENDANCE_EMAIL"];

  function failure_(code, message) {
    var error = new Error(message); error.code = code; return error;
  }
  if (!baseRecipe || typeof baseRecipe.preflight !== "function" ||
      typeof baseRecipe.apply !== "function" || typeof baseRecipe.restore !== "function" ||
      !propertyStore || typeof propertyStore.getProperty !== "function" ||
      typeof propertyStore.setProperty !== "function" ||
      typeof lifecycleFactory !== "function" || typeof detailFactory !== "function" ||
      typeof portalFactory !== "function" || typeof myAccessFactory !== "function" ||
      typeof idProvider !== "function") {
    throw failure_("ACCESS_PORTAL_RECIPE_UNAVAILABLE", "La recette ACCESS-002-05 est indisponible.");
  }
  function identity_(key) {
    var value = String(propertyStore.getProperty(key) || "").trim().toLowerCase();
    if (!value || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw failure_("ACCESS_PORTAL_RECIPE_IDENTITY_INVALID",
        "Une identité de recette ACCESS-002-05 est absente ou invalide.");
    }
    return value;
  }
  function profiles_() {
    var values = PROFILE_KEYS.map(identity_);
    if (values[0] === values[1]) {
      throw failure_("ACCESS_PORTAL_RECIPE_IDENTITIES_DUPLICATED",
        "Les identités de recette ACCESS-002-05 doivent être distinctes.");
    }
    return { noAccess: values[0], attendance: values[1] };
  }
  function backup_() {
    var parsed;
    try { parsed = JSON.parse(propertyStore.getProperty(BACKUP_KEY) || ""); } catch (ignored) {}
    if (!parsed || parsed.schemaVersion !== "access-recipe-backup/1.0" || !parsed.manager) {
      throw failure_("ACCESS_PORTAL_RECIPE_BACKUP_INVALID",
        "La sauvegarde réversible ACCESS est indisponible.");
    }
    return parsed;
  }
  function advance_(result, profileIds) {
    var current = backup_();
    current.afterRevision = result.revision;
    current.afterRaw = propertyStore.getProperty("AKS_ACCESS_REGISTRY");
    current.changedAccountIds = [current.manager].concat(profileIds).sort();
    propertyStore.setProperty(BACKUP_KEY, JSON.stringify(current));
    return result.revision;
  }
  function command_(accountId, revision, suffix) {
    return { accountId: accountId, expectedRevision: revision,
      requestId: "req-access00205-" + suffix + "-" +
        String(idProvider()).replace(/[^A-Za-z0-9._:-]/g, "-") };
  }
  function registryContains_(ids) {
    var parsed;
    try { parsed = JSON.parse(propertyStore.getProperty("AKS_ACCESS_REGISTRY") || ""); }
    catch (ignored) { return false; }
    return parsed && Array.isArray(parsed.accounts) && ids.some(function (id) {
      return parsed.accounts.some(function (account) {
        return String(account.email || "").trim().toLowerCase() === id;
      });
    });
  }
  function preflight() {
    var base = baseRecipe.preflight();
    var profiles = profiles_(), ids = [profiles.noAccess, profiles.attendance];
    if (registryContains_(ids)) {
      throw failure_("ACCESS_PORTAL_RECIPE_ACCOUNT_EXISTS", "Un compte de recette existe déjà.");
    }
    return Object.freeze({ ok: true, phase: "PREFLIGHT", environment: base.environment,
      scriptIdSuffix: base.scriptIdSuffix, registryRevision: base.registryRevision,
      profilesProposed: ["NO_ACCESS", "ATTENDANCE_ONLY"], writePerformed: false });
  }
  function apply() {
    var profiles = profiles_(), ids = [profiles.noAccess, profiles.attendance];
    var base = baseRecipe.apply(), manager = backup_().manager;
    var lifecycle = lifecycleFactory(manager), detail = detailFactory(manager);
    var revision = base.revision;
    try {
      revision = advance_(lifecycle.createAccount(Object.assign(
        command_(profiles.noAccess, revision, "empty-create"),
        { displayName: "Profil sans accès recette", role: "CONSULTATION" })), ids);
      revision = advance_(lifecycle.reactivateAccount(Object.assign(
        command_(profiles.noAccess, revision, "empty-activate"), { clearAssignments: true })), ids);
      revision = advance_(lifecycle.createAccount(Object.assign(
        command_(profiles.attendance, revision, "attendance-create"),
        { displayName: "Profil Présences recette", role: "PROFESSEUR" })), ids);
      revision = advance_(lifecycle.reactivateAccount(Object.assign(
        command_(profiles.attendance, revision, "attendance-activate"),
        { clearAssignments: true })), ids);
      revision = advance_(detail.saveAccountAccess({ accountId: profiles.attendance,
        expectedRevision: revision, requestId: command_(profiles.attendance, revision,
          "attendance-save").requestId, roles: ["PROFESSEUR"], confirmSensitive: false,
        comment: "Recette réversible ACCESS-002-05", assignments: [{
          module: "", season: "2099-2100", section: "",
          courseCode: "ACCESS00205RECIPE",
          status: "ACTIVE", roles: ["PROFESSEUR"],
          capabilities: ["COURSE_LIST", "ATTENDANCE_READ"], validFrom: "", validUntil: ""
        }] }), ids);
      var emptyPortal = portalFactory(profiles.noAccess).getPortalModel();
      var emptyAccess = myAccessFactory(profiles.noAccess).getMyAccess();
      var attendancePortal = portalFactory(profiles.attendance).getPortalModel();
      var attendanceAccess = myAccessFactory(profiles.attendance).getMyAccess();
      var destinationIds = attendancePortal.destinations.map(function (entry) { return entry.id; });
      if (emptyPortal.state !== "NO_ACCESS" || emptyAccess.state !== "NO_ACCESS" ||
          destinationIds.indexOf("module.analytics.attendance") === -1 ||
          destinationIds.indexOf("module.analytics") !== -1 ||
          destinationIds.indexOf("admin.access") !== -1 ||
          attendanceAccess.assignments.length !== 1) {
        throw failure_("ACCESS_PORTAL_RECIPE_VERIFICATION_FAILED",
          "Les projections multi-profils ACCESS-002-05 ne sont pas conformes.");
      }
      return Object.freeze({ ok: true, phase: "APPLIED", revision: revision,
        noAccessVerified: true, attendanceOnlyVerified: true,
        myAccessVerified: true, forbiddenDestinationsHidden: true, backupVerified: true });
    } catch (error) {
      try { baseRecipe.restore(); } catch (restoreFailure) {
        throw failure_("ACCESS_PORTAL_RECIPE_RECOVERY_REQUIRED",
          "La recette a échoué et exige une restauration contrôlée.");
      }
      throw error;
    }
  }
  function restore() {
    var result = baseRecipe.restore();
    return Object.freeze({ ok: true, phase: "RESTORED", revision: result.revision,
      exactRestore: result.exactRestore === true || result.alreadyRestored === true,
      backupRemoved: result.backupRemoved === true || result.alreadyRestored === true });
  }
  return Object.freeze({ preflight: preflight, apply: apply, restore: restore });
}

function AKS_createDefaultAccess002PortalRecipe_() {
  var propertyStore = PropertiesService.getScriptProperties();
  var courseProvider = Object.freeze({ list: function () {
    return [{ code: "ACCESS00205RECIPE", season: "2099-2100", active: true }];
  } });
  function service_(identity) { return AKS_createAccessService_({
    identityProvider: function () { return identity; },
    registryStore: AKS_createAccessRegistryStore_(propertyStore),
    courseProvider: courseProvider
  }); }
  function admin_(identity) { return AKS.Core.AccessAdmin.create({ accessService: service_(identity) }); }
  return AKS_createAccess002PortalRecipe_({
    baseRecipe: AKS_createDefaultAccess002Recipe_({ courseProvider: courseProvider }),
    propertyStore: propertyStore,
    lifecycleFactory: function (identity) { return AKS.Core.AccessAccountLifecycle.create({ accessAdmin: admin_(identity) }); },
    detailFactory: function (identity) { return AKS.Core.AccessAccountDetail.create({ accessAdmin: admin_(identity) }); },
    portalFactory: function (identity) { return AKS.Core.AccessPortalProjection.create({
      accessService: service_(identity), legacyAdministrator: function () { return false; },
      baseUrlProvider: function () { return ScriptApp.getService().getUrl() || ""; }
    }); },
    myAccessFactory: function (identity) { return AKS.Core.AccessMyAccess.create({ accessService: service_(identity) }); },
    idProvider: function () { return Utilities.getUuid(); }
  });
}

function AKS_preflightAccess002PortalRecipe() {
  var result = AKS_createDefaultAccess002PortalRecipe_().preflight();
  console.log("PRÉCONTRÔLE RECETTE ACCESS-002-05: " + JSON.stringify(result)); return result;
}
function AKS_applyAccess002PortalRecipe() {
  var result = AKS_createDefaultAccess002PortalRecipe_().apply();
  console.log("APPLICATION RECETTE ACCESS-002-05: " + JSON.stringify(result)); return result;
}
function AKS_restoreAccess002PortalRecipe() {
  var result = AKS_createDefaultAccess002PortalRecipe_().restore();
  console.log("RESTAURATION RECETTE ACCESS-002-05: " + JSON.stringify(result)); return result;
}
