var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ACCESS-001 authorization service.
 *
 * All production decisions are recalculated server-side from the active Google
 * identity, the central registry and the server-owned course catalogue.
 */
function AKS_createAccessService_(options) {
  "use strict";

  options = options || {};
  var SCHEMA_VERSION = "access/1.0";
  var ROLES = {
    ADMINISTRATEUR: true,
    PROFESSEUR: true,
    ASSISTANT_AFA: true,
    CONSULTATION: true
  };
  var CAPABILITIES = {
    COURSE_LIST: true,
    SESSION_LIST: true,
    ATTENDANCE_READ: true,
    SESSION_CREATE: true,
    ATTENDANCE_WRITE_DRAFT: true,
    SESSION_CLOSE: true,
    ATTENDANCE_CORRECT_CLOSED: true,
    ACCESS_MANAGE: true,
    ANALYTICS_PREVIEW: true,
    ANALYTICS_PUBLISH: true,
    AUDIT_READ: true,
    INSCRIPTIONS_READ: true,
    INSCRIPTIONS_ANALYZE_IMPORT: true,
    INSCRIPTIONS_CONTROL: true,
    INSCRIPTIONS_WRITE: true,
    INSCRIPTIONS_APPLY_IMPORT: true,
    INSCRIPTIONS_ACTIVATE: true
  };
  var INSCRIPTIONS_CAPABILITIES = {
    INSCRIPTIONS_READ: "OPTIONAL",
    INSCRIPTIONS_ANALYZE_IMPORT: "FORBIDDEN",
    INSCRIPTIONS_CONTROL: "OPTIONAL",
    INSCRIPTIONS_WRITE: "OPTIONAL",
    INSCRIPTIONS_APPLY_IMPORT: "FORBIDDEN",
    INSCRIPTIONS_ACTIVATE: "REQUIRED"
  };
  var ROLE_CAPABILITIES = {
    ADMINISTRATEUR: Object.keys(CAPABILITIES),
    PROFESSEUR: [
      "COURSE_LIST", "SESSION_LIST", "ATTENDANCE_READ", "SESSION_CREATE",
      "ATTENDANCE_WRITE_DRAFT", "SESSION_CLOSE"
    ],
    ASSISTANT_AFA: [
      "COURSE_LIST", "SESSION_LIST", "ATTENDANCE_READ", "SESSION_CREATE",
      "ATTENDANCE_WRITE_DRAFT"
    ],
    CONSULTATION: ["COURSE_LIST", "SESSION_LIST", "ATTENDANCE_READ"]
  };
  var identityProvider = options.identityProvider || function () {
    return Session.getActiveUser().getEmail();
  };
  var registryStore = options.registryStore ||
    (typeof AKS_createScriptAccessRegistryStore_ === "function"
      ? AKS_createScriptAccessRegistryStore_()
      : null);
  var courseProvider = options.courseProvider || { list: function () { return []; } };
  var inscriptionsCatalogueProvider = options.inscriptionsCatalogueProvider ||
    { list: function () { return []; } };
  var legacyAdminEmails = options.legacyAdminEmails ||
    (AKS.Config && typeof AKS.Config.getAuthorizedAdminEmails === "function"
      ? AKS.Config.getAuthorizedAdminEmails()
      : []);
  var clock = options.clock || function () { return new Date(); };
  var audit = options.audit || { record: function () {} };

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function normalizeEmail_(value) {
    return String(value || "").trim().toLowerCase();
  }

  function upper_(value) {
    return String(value || "").trim().toUpperCase();
  }

  function validSeason_(season) {
    return season === "*" || (
      /^\d{4}-\d{4}$/.test(season) &&
      Number(season.slice(5)) === Number(season.slice(0, 4)) + 1
    );
  }

  function activeAt_(record, now) {
    if (!record || record.status !== "ACTIVE") return false;
    var today = now.toISOString().slice(0, 10);
    return (!record.validFrom || record.validFrom <= today) &&
      (!record.validUntil || record.validUntil >= today);
  }

  function uniqueKnownValues_(values, catalogue, code) {
    if (!Array.isArray(values) || values.length === 0) {
      throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès invalide.");
    }
    var seen = {};
    return values.map(upper_).map(function (value) {
      if (!catalogue[value] || seen[value]) {
        throw error_(code || "ACCESS_REGISTRY_INVALID", "Registre d'accès invalide.");
      }
      seen[value] = true;
      return value;
    });
  }

  function normalizeAssignment_(assignment) {
    if (!assignment || typeof assignment !== "object") {
      throw error_("ACCESS_REGISTRY_INVALID", "Affectation d'accès invalide.");
    }
    var module = upper_(assignment.module);
    var normalized = {
      module: module,
      section: upper_(assignment.section),
      courseCode: upper_(assignment.courseCode),
      season: String(assignment.season || "").trim(),
      status: upper_(assignment.status),
      roles: uniqueKnownValues_(assignment.roles, ROLES),
      extraCapabilities: [],
      validFrom: assignment.validFrom || "",
      validUntil: assignment.validUntil || ""
    };
    if (!validSeason_(normalized.season) ||
        (normalized.status !== "ACTIVE" && normalized.status !== "INACTIVE")) {
      throw error_("ACCESS_REGISTRY_INVALID", "Affectation d'accès invalide.");
    }
    if (module === "INSCRIPTIONS") {
      if (!normalized.section) {
        throw error_("ACCESS_REGISTRY_INVALID", "Périmètre Inscriptions invalide.");
      }
    } else if (module || normalized.section || !normalized.courseCode) {
      throw error_("ACCESS_REGISTRY_INVALID", "Affectation d'accès invalide.");
    }
    (assignment.extraCapabilities || []).forEach(function (capability) {
      capability = upper_(capability);
      if (!CAPABILITIES[capability] ||
          capability === "ATTENDANCE_CORRECT_CLOSED" ||
          capability === "ACCESS_MANAGE" ||
          capability === "ANALYTICS_PUBLISH" ||
          capability === "AUDIT_READ" ||
          normalized.extraCapabilities.indexOf(capability) !== -1) {
        throw error_("ACCESS_REGISTRY_INVALID", "Capacité complémentaire invalide.");
      }
      if (module === "INSCRIPTIONS") {
        if (!INSCRIPTIONS_CAPABILITIES[capability] ||
            INSCRIPTIONS_CAPABILITIES[capability] === "REQUIRED" && !normalized.courseCode ||
            INSCRIPTIONS_CAPABILITIES[capability] === "FORBIDDEN" && normalized.courseCode) {
          throw error_("ACCESS_REGISTRY_INVALID", "Capacité Inscriptions incohérente.");
        }
      } else if (INSCRIPTIONS_CAPABILITIES[capability]) {
        throw error_("ACCESS_REGISTRY_INVALID", "Capacité Inscriptions hors module.");
      }
      normalized.extraCapabilities.push(capability);
    });
    if (module === "INSCRIPTIONS" && normalized.extraCapabilities.length === 0) {
      throw error_("ACCESS_REGISTRY_INVALID", "Capacité Inscriptions absente.");
    }
    return normalized;
  }

  function normalizeRegistry_(registry) {
    if (!registry || registry.schemaVersion !== SCHEMA_VERSION ||
        !Array.isArray(registry.accounts)) {
      throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès indisponible.");
    }
    var emails = {};
    var accounts = registry.accounts.map(function (account) {
      var email = normalizeEmail_(account && account.email);
      if (!email || emails[email]) {
        throw error_("ACCESS_REGISTRY_INVALID", "Compte d'accès absent ou dupliqué.");
      }
      emails[email] = true;
      var status = upper_(account.status);
      if (status !== "ACTIVE" && status !== "INACTIVE") {
        throw error_("ACCESS_REGISTRY_INVALID", "Statut de compte invalide.");
      }
      return {
        email: email,
        displayName: String(account.displayName || "").trim(),
        status: status,
        roles: uniqueKnownValues_(account.roles, ROLES),
        assignments: (account.assignments || []).map(normalizeAssignment_),
        validFrom: account.validFrom || "",
        validUntil: account.validUntil || ""
      };
    });
    return { schemaVersion: SCHEMA_VERSION, accounts: accounts };
  }

  function courses_() {
    if (!courseProvider || typeof courseProvider.list !== "function") {
      throw error_("ACCESS_REGISTRY_INVALID", "Catalogue des cours indisponible.");
    }
    return courseProvider.list().map(function (course) {
      return {
        code: upper_(course.code),
        season: String(course.season || "").trim(),
        active: course.active !== false
      };
    });
  }

  function currentIdentity_() {
    var email = normalizeEmail_(identityProvider());
    if (!email) throw error_("ACCESS_AUTH_REQUIRED", "Compte Google non identifié.");
    return email;
  }

  function loadedRegistry_() {
    if (!registryStore || typeof registryStore.load !== "function") {
      throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès indisponible.");
    }
    var registry = registryStore.load();
    return registry === null ? null : normalizeRegistry_(registry);
  }

  function legacyAdministrator_(email) {
    return legacyAdminEmails.map(normalizeEmail_).indexOf(email) !== -1;
  }

  function accountFor_(registry, email, now) {
    var matches = registry.accounts.filter(function (account) {
      return account.email === email;
    });
    return matches.length === 1 && activeAt_(matches[0], now) ? matches[0] : null;
  }

  function assignmentCapabilities_(account, courseCode, season, now) {
    var result = {};
    account.assignments.forEach(function (assignment) {
      if (assignment.module === "INSCRIPTIONS" || !activeAt_(assignment, now) ||
          assignment.courseCode !== courseCode ||
          (assignment.season !== "*" && assignment.season !== season)) return;
      assignment.roles.forEach(function (role) {
        if (account.roles.indexOf(role) === -1) return;
        ROLE_CAPABILITIES[role].forEach(function (capability) {
          result[capability] = true;
        });
      });
      assignment.extraCapabilities.forEach(function (capability) {
        result[capability] = true;
      });
    });
    return result;
  }

  function inscriptionsCatalogue_() {
    if (!inscriptionsCatalogueProvider ||
        typeof inscriptionsCatalogueProvider.list !== "function") {
      throw error_("ACCESS_SCOPE_INVALID", "Catalogue Inscriptions indisponible.");
    }
    var entries = inscriptionsCatalogueProvider.list();
    if (!Array.isArray(entries)) {
      throw error_("ACCESS_SCOPE_INVALID", "Catalogue Inscriptions invalide.");
    }
    var seen = {};
    return entries.map(function (entry) {
      if (!entry || !Array.isArray(entry.courseCodes)) {
        throw error_("ACCESS_SCOPE_INVALID", "Catalogue Inscriptions invalide.");
      }
      var normalized = {
        season: String(entry.season || "").trim(),
        section: upper_(entry.section),
        courseCodes: entry.courseCodes.map(upper_),
        active: entry.active !== false
      };
      var key = normalized.season + "|" + normalized.section;
      if (!validSeason_(normalized.season) || normalized.season === "*" ||
          !normalized.section || seen[key] ||
          normalized.courseCodes.some(function (code, index, values) {
            return !code || values.indexOf(code) !== index;
          })) {
        throw error_("ACCESS_SCOPE_INVALID", "Catalogue Inscriptions invalide.");
      }
      seen[key] = true;
      return normalized;
    });
  }

  function resolveInscriptionsScope_(capability, scope) {
    scope = scope || {};
    var normalized = {
      module: upper_(scope.module),
      season: String(scope.season || "").trim(),
      section: upper_(scope.section),
      courseCode: upper_(scope.courseCode)
    };
    var courseRule = INSCRIPTIONS_CAPABILITIES[capability];
    if (!courseRule || normalized.module !== "INSCRIPTIONS" ||
        !validSeason_(normalized.season) || normalized.season === "*" ||
        !normalized.section ||
        courseRule === "REQUIRED" && !normalized.courseCode ||
        courseRule === "FORBIDDEN" && normalized.courseCode) {
      throw error_("ACCESS_SCOPE_INVALID", "Périmètre Inscriptions invalide.");
    }
    var matches = inscriptionsCatalogue_().filter(function (entry) {
      return entry.active && entry.season === normalized.season &&
        entry.section === normalized.section;
    });
    if (matches.length !== 1 || normalized.courseCode &&
        matches[0].courseCodes.indexOf(normalized.courseCode) === -1) {
      throw error_("ACCESS_SCOPE_INVALID", "Périmètre Inscriptions inconnu.");
    }
    return normalized;
  }

  function inscriptionsAssignmentAllows_(account, assignment, capability, scope, now) {
    return assignment.module === "INSCRIPTIONS" && activeAt_(assignment, now) &&
      assignment.roles.some(function (role) {
        return account.roles.indexOf(role) !== -1;
      }) &&
      assignment.extraCapabilities.indexOf(capability) !== -1 &&
      (assignment.season === "*" || assignment.season === scope.season) &&
      assignment.section === scope.section &&
      (!scope.courseCode ? !assignment.courseCode :
        !assignment.courseCode || assignment.courseCode === scope.courseCode);
  }

  function assertInscriptionsCapability(capability, scope) {
    capability = upper_(capability);
    if (!INSCRIPTIONS_CAPABILITIES[capability]) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Capacité Inscriptions non autorisée.");
    }
    var normalizedScope = resolveInscriptionsScope_(capability, scope);
    var context = context_();
    if (context.legacyBootstrap ||
        context.account.roles.indexOf("ADMINISTRATEUR") !== -1) return true;
    var allowed = context.account.assignments.some(function (assignment) {
      return inscriptionsAssignmentAllows_(
        context.account, assignment, capability, normalizedScope, context.now);
    });
    if (!allowed) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Opération Inscriptions non autorisée.");
    }
    return true;
  }

  function resolveCourse_(courseCode, season) {
    courseCode = upper_(courseCode);
    season = String(season || "").trim();
    if (!courseCode || !validSeason_(season) || season === "*") {
      throw error_("ACCESS_SCOPE_INVALID", "Périmètre d'accès invalide.");
    }
    var matches = courses_().filter(function (course) {
      return course.active && course.code === courseCode && course.season === season;
    });
    if (matches.length !== 1) {
      throw error_("ACCESS_SCOPE_INVALID", "Cours ou saison incohérent.");
    }
    return matches[0];
  }

  function context_() {
    var email = currentIdentity_();
    var now = clock();
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw error_("ACCESS_REGISTRY_INVALID", "Horloge d'autorisation invalide.");
    }
    var registry = loadedRegistry_();
    if (registry === null) {
      if (!legacyAdministrator_(email)) {
        throw error_("ACCESS_DENIED", "Opération non autorisée.");
      }
      return { email: email, legacyBootstrap: true, account: null, now: now };
    }
    var account = accountFor_(registry, email, now);
    if (!account) throw error_("ACCESS_DENIED", "Opération non autorisée.");
    return { email: email, legacyBootstrap: false, account: account, now: now };
  }

  function capabilitiesFor_(context, courseCode, season) {
    if (context.legacyBootstrap ||
        context.account.roles.indexOf("ADMINISTRATEUR") !== -1) {
      return CAPABILITIES;
    }
    return assignmentCapabilities_(context.account, courseCode, season, context.now);
  }

  function assertCapability(capability, courseCode, season) {
    capability = upper_(capability);
    if (!CAPABILITIES[capability]) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Capacité non autorisée.");
    }
    resolveCourse_(courseCode, season);
    var context = context_();
    if (!capabilitiesFor_(context, upper_(courseCode), season)[capability]) {
      throw error_(
        capability === "COURSE_LIST" ? "ACCESS_COURSE_DENIED" : "ACCESS_CAPABILITY_DENIED",
        "Opération non autorisée."
      );
    }
    return true;
  }

  function hasCapability(capability, courseCode, season) {
    try {
      assertCapability(capability, courseCode, season);
      return true;
    } catch (failure) {
      return false;
    }
  }

  function listAuthorizedCourses(capability) {
    capability = upper_(capability);
    if (!CAPABILITIES[capability]) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Capacité non autorisée.");
    }
    var context = context_();
    return courses_().filter(function (course) {
      return course.active &&
        capabilitiesFor_(context, course.code, course.season)[capability];
    }).map(function (course) {
      return Object.freeze({ code: course.code, season: course.season });
    });
  }

  function effectiveContext() {
    var context = context_();
    return Object.freeze({
      email: context.email,
      courses: Object.freeze(listAuthorizedCourses("COURSE_LIST")),
      bootstrap: context.legacyBootstrap
    });
  }

  function saveRegistry(registry) {
    var actor = currentIdentity_();
    var normalized = normalizeRegistry_(registry);
    var now = clock();
    var activeAdministrators = normalized.accounts.filter(function (account) {
      return activeAt_(account, now) &&
        account.roles.indexOf("ADMINISTRATEUR") !== -1;
    });
    if (activeAdministrators.length === 0) {
      throw error_("ACCESS_REGISTRY_INVALID", "Un administrateur actif est obligatoire.");
    }
    var current = loadedRegistry_();
    if (current !== null) {
      var actorAccount = accountFor_(current, actor, now);
      if (!actorAccount || actorAccount.roles.indexOf("ADMINISTRATEUR") === -1) {
        throw error_("ACCESS_CAPABILITY_DENIED", "Gestion des accès non autorisée.");
      }
    } else if (!legacyAdministrator_(actor)) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Gestion des accès non autorisée.");
    }
    if (!registryStore || typeof registryStore.save !== "function") {
      throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès indisponible.");
    }
    registryStore.save(normalized);
    audit.record({
      action: "ACCESS_REGISTRY_UPDATE",
      actor: actor,
      result: "SUCCESS",
      schemaVersion: SCHEMA_VERSION
    });
    return normalized;
  }

  return Object.freeze({
    getCapabilityCatalogue: function () { return Object.freeze(Object.keys(CAPABILITIES)); },
    getCurrentIdentity: currentIdentity_,
    listAuthorizedCourses: listAuthorizedCourses,
    hasCapability: hasCapability,
    assertCapability: assertCapability,
    assertInscriptionsCapability: assertInscriptionsCapability,
    getEffectiveAccessContext: effectiveContext,
    saveRegistry: saveRegistry
  });
}

AKS.Core.Access = Object.freeze({
  create: AKS_createAccessService_
});
