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
  var SCHEMA_VERSION = "access/1.2";
  var PREVIOUS_SCHEMA_VERSION = "access/1.1";
  var LEGACY_SCHEMA_VERSION = "access/1.0";
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
    ANALYTICS_READ: true,
    ANALYTICS_PREVIEW: true,
    ANALYTICS_PUBLISH: true,
    CONFIG_READ: true,
    CONFIG_WRITE: true,
    CONFIG_RESET: true,
    LOG_READ: true,
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
  var ANALYTICS_CAPABILITIES = {
    ANALYTICS_READ: true,
    ANALYTICS_PREVIEW: true,
    ANALYTICS_PUBLISH: true
  };
  var ADMINISTRATION_CAPABILITIES = {
    CONFIG_READ: true,
    CONFIG_WRITE: true,
    CONFIG_RESET: true,
    LOG_READ: true
  };
  var ROLE_CAPABILITIES = {
    ADMINISTRATEUR: [],
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
  var audit = options.audit ||
    (AKS.Core && AKS.Core.Audit ? AKS.Core.Audit : null);
  var correlationIdProvider = options.correlationIdProvider || function () {
    return "corr-access-" + Utilities.getUuid();
  };
  var registryLock = options.registryLock || null;
  var LOCK_TIMEOUT_MS = 30000;

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function normalizeEmail_(value) {
    return String(value || "").trim().toLowerCase();
  }

  function validEmail_(email) {
    return email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function upper_(value) {
    return String(value || "").trim().toUpperCase();
  }

  function normalizeAuditContext_(value) {
    if (typeof value === "undefined") return {};
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw error_("ACCESS_COMMAND_INVALID", "Contexte d'audit invalide.");
    }
    var requestId = String(value.requestId || "").trim();
    var operation = upper_(value.operation);
    var comment = String(value.comment || "").trim().replace(/\s+/g, " ");
    var summary = value.summary || {};
    if (requestId && !/^req-[A-Za-z0-9][A-Za-z0-9._:-]{2,95}$/.test(requestId) ||
        operation && !/^[A-Z][A-Z0-9_]{1,47}$/.test(operation) ||
        comment.length > 500 ||
        (!summary || typeof summary !== "object" || Array.isArray(summary)) ||
        value.sensitive !== true && value.sensitive !== false &&
          typeof value.sensitive !== "undefined") {
      throw error_("ACCESS_COMMAND_INVALID", "Contexte d'audit invalide.");
    }
    return {
      requestId: requestId,
      operation: operation,
      comment: comment,
      sensitive: value.sensitive === true,
      rolesAdded: Array.isArray(summary.rolesAdded) ? summary.rolesAdded.slice() : [],
      rolesRemoved: Array.isArray(summary.rolesRemoved) ? summary.rolesRemoved.slice() : [],
      assignmentsAdded: Array.isArray(summary.assignmentsAdded)
        ? summary.assignmentsAdded.length : 0,
      assignmentsRemoved: Array.isArray(summary.assignmentsRemoved)
        ? summary.assignmentsRemoved.length : 0
    };
  }

  function immutableCopy_(value) {
    function freeze_(entry) {
      if (!entry || typeof entry !== "object" || Object.isFrozen(entry)) return entry;
      Object.keys(entry).forEach(function (key) { freeze_(entry[key]); });
      return Object.freeze(entry);
    }
    return freeze_(JSON.parse(JSON.stringify(value)));
  }

  function validSeason_(season) {
    return season === "*" || (
      /^\d{4}-\d{4}$/.test(season) &&
      Number(season.slice(5)) === Number(season.slice(0, 4)) + 1
    );
  }

  function normalizeDate_(value) {
    var date = String(value || "").trim();
    if (!date) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw error_("ACCESS_REGISTRY_INVALID", "Date d'accès invalide.");
    }
    var parsed = new Date(date + "T00:00:00.000Z");
    if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw error_("ACCESS_REGISTRY_INVALID", "Date d'accès invalide.");
    }
    return date;
  }

  function validatePeriod_(record) {
    if (record.validFrom && record.validUntil &&
        record.validFrom > record.validUntil) {
      throw error_("ACCESS_REGISTRY_INVALID", "Période d'accès incohérente.");
    }
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

  function normalizeAssignment_(assignment, sourceSchemaVersion) {
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
      validFrom: normalizeDate_(assignment.validFrom),
      validUntil: normalizeDate_(assignment.validUntil)
    };
    if (!validSeason_(normalized.season) ||
        (normalized.status !== "ACTIVE" && normalized.status !== "INACTIVE")) {
      throw error_("ACCESS_REGISTRY_INVALID", "Affectation d'accès invalide.");
    }
    if (module === "ACCESS") {
      if (normalized.season !== "*" || normalized.section || normalized.courseCode) {
        throw error_("ACCESS_REGISTRY_INVALID", "Périmètre ACCESS invalide.");
      }
    } else if (module === "ANALYTICS") {
      if (normalized.season !== "*" || normalized.section || normalized.courseCode) {
        throw error_("ACCESS_REGISTRY_INVALID", "Périmètre Analytics invalide.");
      }
    } else if (module === "ADMINISTRATION") {
      if (sourceSchemaVersion !== SCHEMA_VERSION || normalized.season !== "*" ||
          normalized.section || normalized.courseCode) {
        throw error_("ACCESS_REGISTRY_INVALID", "Périmètre Administration invalide.");
      }
    } else if (module === "INSCRIPTIONS") {
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
          (capability === "ACCESS_MANAGE" && module !== "ACCESS") ||
          capability === "AUDIT_READ" ||
          normalized.extraCapabilities.indexOf(capability) !== -1) {
        throw error_("ACCESS_REGISTRY_INVALID", "Capacité complémentaire invalide.");
      }
      if (module === "ACCESS") {
        if (capability !== "ACCESS_MANAGE") {
          throw error_("ACCESS_REGISTRY_INVALID", "Capacité ACCESS incohérente.");
        }
      } else if (module === "ANALYTICS") {
        if (!ANALYTICS_CAPABILITIES[capability]) {
          throw error_("ACCESS_REGISTRY_INVALID", "Capacité Analytics incohérente.");
        }
      } else if (module === "ADMINISTRATION") {
        if (!ADMINISTRATION_CAPABILITIES[capability]) {
          throw error_("ACCESS_REGISTRY_INVALID", "Capacité Administration incohérente.");
        }
      } else if (module === "INSCRIPTIONS") {
        if (!INSCRIPTIONS_CAPABILITIES[capability] ||
            INSCRIPTIONS_CAPABILITIES[capability] === "REQUIRED" && !normalized.courseCode ||
            INSCRIPTIONS_CAPABILITIES[capability] === "FORBIDDEN" && normalized.courseCode) {
          throw error_("ACCESS_REGISTRY_INVALID", "Capacité Inscriptions incohérente.");
        }
      } else if (INSCRIPTIONS_CAPABILITIES[capability] ||
          ADMINISTRATION_CAPABILITIES[capability] ||
          ANALYTICS_CAPABILITIES[capability] &&
          sourceSchemaVersion !== LEGACY_SCHEMA_VERSION) {
        throw error_("ACCESS_REGISTRY_INVALID", "Capacité hors module.");
      }
      normalized.extraCapabilities.push(capability);
    });
    if (module === "ACCESS" &&
        (normalized.extraCapabilities.length !== 1 ||
          normalized.extraCapabilities[0] !== "ACCESS_MANAGE")) {
      throw error_("ACCESS_REGISTRY_INVALID", "Capacité ACCESS absente.");
    }
    if (module === "INSCRIPTIONS" && normalized.extraCapabilities.length === 0) {
      throw error_("ACCESS_REGISTRY_INVALID", "Capacité Inscriptions absente.");
    }
    if (module === "ANALYTICS" && normalized.extraCapabilities.length === 0) {
      throw error_("ACCESS_REGISTRY_INVALID", "Capacité Analytics absente.");
    }
    if (module === "ADMINISTRATION" && normalized.extraCapabilities.length === 0) {
      throw error_("ACCESS_REGISTRY_INVALID", "Capacité Administration absente.");
    }
    validatePeriod_(normalized);
    return normalized;
  }

  function normalizeRegistry_(registry) {
    if (!registry ||
        (registry.schemaVersion !== SCHEMA_VERSION &&
          registry.schemaVersion !== PREVIOUS_SCHEMA_VERSION &&
          registry.schemaVersion !== LEGACY_SCHEMA_VERSION) ||
        !Array.isArray(registry.accounts)) {
      throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès indisponible.");
    }
    var emails = {};
    var accounts = registry.accounts.map(function (account) {
      var email = normalizeEmail_(account && account.email);
      if (!validEmail_(email) || emails[email]) {
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
        assignments: Array.isArray(account.assignments)
          ? account.assignments.map(function (assignment) {
            return normalizeAssignment_(assignment, registry.schemaVersion);
          }) : (function () {
            throw error_("ACCESS_REGISTRY_INVALID", "Affectations de compte invalides.");
          }()),
        validFrom: normalizeDate_(account.validFrom),
        validUntil: normalizeDate_(account.validUntil),
        updatedAt: String(account.updatedAt || "").trim(),
        updatedBy: normalizeEmail_(account.updatedBy)
      };
    }).map(function (account) {
      validatePeriod_(account);
      return account;
    });
    return { schemaVersion: SCHEMA_VERSION, accounts: accounts };
  }

  function canonicalRegistry_(registry) {
    return JSON.stringify(registry === null ? null : registry);
  }

  function rawRegistry_() {
    if (!registryStore || typeof registryStore.load !== "function") {
      throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès indisponible.");
    }
    var registry = registryStore.load();
    return registry === null ? null : JSON.parse(JSON.stringify(registry));
  }

  function assertExplicitCapabilityCoherence_(registry) {
    registry.accounts.forEach(function (account) {
      account.assignments.forEach(function (assignment) {
        var capabilities = assignment.extraCapabilities;
        function has_(capability) { return capabilities.indexOf(capability) !== -1; }
        if (assignment.module === "ANALYTICS" &&
            (has_("ANALYTICS_PREVIEW") && !has_("ANALYTICS_READ") ||
             has_("ANALYTICS_PUBLISH") &&
               (!has_("ANALYTICS_READ") || !has_("ANALYTICS_PREVIEW")))) {
          throw error_("ACCESS_REGISTRY_INVALID", "Capacités Analytics incohérentes.");
        }
        if (assignment.module === "ADMINISTRATION" &&
            (has_("CONFIG_WRITE") && !has_("CONFIG_READ") ||
             has_("CONFIG_RESET") &&
               (!has_("CONFIG_READ") || !has_("CONFIG_WRITE")))) {
          throw error_("ACCESS_REGISTRY_INVALID", "Capacités Administration incohérentes.");
        }
      });
    });
  }

  function revisionFor_(registry) {
    var text = canonicalRegistry_(registry);
    var first = 2166136261;
    var second = 5381;
    for (var index = 0; index < text.length; index += 1) {
      first ^= text.charCodeAt(index);
      first = Math.imul(first, 16777619);
      second = ((second << 5) + second) ^ text.charCodeAt(index);
    }
    return "access-rev/1-" + text.length.toString(36) + "-" +
      (first >>> 0).toString(36) + "-" + (second >>> 0).toString(36);
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

  function validateRegistryScopes_(registry, now) {
    var courseCatalogue = courses_();
    var courseKeys = {};
    courseCatalogue.forEach(function (course) {
      var key = course.code + "|" + course.season;
      if (!course.code || !validSeason_(course.season) || course.season === "*" ||
          courseKeys[key]) {
        throw error_("ACCESS_REGISTRY_INVALID", "Catalogue des cours invalide.");
      }
      courseKeys[key] = true;
    });
    var inscriptionsCatalogue = null;
    registry.accounts.forEach(function (account) {
      account.assignments.forEach(function (assignment) {
        if (!activeAt_(account, now) || !activeAt_(assignment, now)) return;
        if (assignment.module === "ACCESS") {
          if (!assignment.roles.some(function (role) {
            return account.roles.indexOf(role) !== -1;
          })) {
            throw error_("ACCESS_REGISTRY_INVALID", "Rôle ACCESS non détenu.");
          }
          return;
        }
        if (assignment.module === "ANALYTICS") {
          if (!assignment.roles.some(function (role) {
            return account.roles.indexOf(role) !== -1;
          })) {
            throw error_("ACCESS_REGISTRY_INVALID", "Rôle Analytics non détenu.");
          }
          return;
        }
        if (assignment.module === "ADMINISTRATION") {
          if (!assignment.roles.some(function (role) {
            return account.roles.indexOf(role) !== -1;
          })) {
            throw error_("ACCESS_REGISTRY_INVALID", "Rôle Administration non détenu.");
          }
          return;
        }
        if (assignment.module === "INSCRIPTIONS") {
          if (inscriptionsCatalogue === null) {
            inscriptionsCatalogue = inscriptionsCatalogue_();
          }
          var inscriptionsMatches = inscriptionsCatalogue.filter(function (entry) {
            return (assignment.season === "*" || entry.season === assignment.season) &&
              entry.section === assignment.section &&
              (!assignment.courseCode ||
                entry.courseCodes.indexOf(assignment.courseCode) !== -1);
          });
          if (inscriptionsMatches.length === 0) {
            throw error_("ACCESS_REGISTRY_INVALID", "Périmètre Inscriptions inconnu.");
          }
          return;
        }
        var courseMatches = courseCatalogue.filter(function (course) {
          return course.code === assignment.courseCode &&
            (assignment.season === "*" || course.season === assignment.season);
        });
        if (courseMatches.length === 0) {
          throw error_("ACCESS_REGISTRY_INVALID", "Cours ou saison inconnu.");
        }
      });
    });
  }

  function currentIdentity_() {
    var email = normalizeEmail_(identityProvider());
    if (!email) throw error_("ACCESS_AUTH_REQUIRED", "Compte Google non identifié.");
    return email;
  }

  function loadedRegistry_() {
    var registry = rawRegistry_();
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
    if (context.legacyBootstrap) return true;
    var allowed = context.account.assignments.some(function (assignment) {
      return inscriptionsAssignmentAllows_(
        context.account, assignment, capability, normalizedScope, context.now);
    });
    if (!allowed) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Opération Inscriptions non autorisée.");
    }
    return true;
  }

  function assertAnalyticsCapability(capability) {
    capability = upper_(capability);
    if (!ANALYTICS_CAPABILITIES[capability]) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Capacité Analytics non autorisée.");
    }
    var context = context_();
    if (context.legacyBootstrap) return true;
    var allowed = context.account.assignments.some(function (assignment) {
      return assignment.module === "ANALYTICS" && activeAt_(assignment, context.now) &&
        assignment.roles.some(function (role) {
          return context.account.roles.indexOf(role) !== -1;
        }) && assignment.extraCapabilities.indexOf(capability) !== -1;
    });
    if (!allowed) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Opération Analytics non autorisée.");
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
      return {
        email: email,
        legacyBootstrap: true,
        account: null,
        registry: null,
        now: now
      };
    }
    var account = accountFor_(registry, email, now);
    if (!account) throw error_("ACCESS_DENIED", "Opération non autorisée.");
    return {
      email: email,
      legacyBootstrap: false,
      account: account,
      registry: registry,
      now: now
    };
  }

  function administrativeCapabilityAllowed_(context, capability) {
    if (capability !== "ACCESS_MANAGE") return false;
    if (context.legacyBootstrap) return true;
    if (!context.account) return false;
    return context.account.assignments.some(function (assignment) {
      return assignment.module === "ACCESS" && activeAt_(assignment, context.now) &&
        assignment.roles.some(function (role) {
          return context.account.roles.indexOf(role) !== -1;
        }) &&
        assignment.extraCapabilities.indexOf("ACCESS_MANAGE") !== -1;
    });
  }

  function assertAdministrativeCapability(capability) {
    capability = upper_(capability);
    var context = context_();
    if (!administrativeCapabilityAllowed_(context, capability)) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Gestion des accès non autorisée.");
    }
    return true;
  }

  function administrationCapabilityAllowed_(context, capability) {
    if (!ADMINISTRATION_CAPABILITIES[capability]) return false;
    if (context.legacyBootstrap) return true;
    if (!context.account) return false;
    return context.account.assignments.some(function (assignment) {
      return assignment.module === "ADMINISTRATION" && activeAt_(assignment, context.now) &&
        assignment.roles.some(function (role) {
          return context.account.roles.indexOf(role) !== -1;
        }) && assignment.extraCapabilities.indexOf(capability) !== -1;
    });
  }

  function assertAdministrationCapability(capability) {
    capability = upper_(capability);
    var context = context_();
    if (!administrationCapabilityAllowed_(context, capability)) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Administration non autorisée.");
    }
    return true;
  }

  function readRegistryForAdministration() {
    var context = context_();
    if (!administrativeCapabilityAllowed_(context, "ACCESS_MANAGE")) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Gestion des accès non autorisée.");
    }
    return immutableCopy_({
      schemaVersion: SCHEMA_VERSION,
      accounts: context.registry === null ? [] : context.registry.accounts,
      bootstrap: context.registry === null,
      revision: revisionFor_(context.registry)
    });
  }

  function now_() {
    var now = clock();
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw error_("ACCESS_REGISTRY_INVALID", "Horloge d'autorisation invalide.");
    }
    return now;
  }

  function acquireRegistryLock_() {
    var lock = registryLock;
    if (!lock && typeof LockService !== "undefined" &&
        LockService && typeof LockService.getScriptLock === "function") {
      lock = LockService.getScriptLock();
    }
    if (!lock || typeof lock.tryLock !== "function" ||
        typeof lock.releaseLock !== "function") {
      throw error_("ACCESS_REGISTRY_LOCK_UNAVAILABLE", "Verrou du registre indisponible.");
    }
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      throw error_("ACCESS_REGISTRY_LOCK_UNAVAILABLE", "Registre momentanément indisponible.");
    }
    return lock;
  }

  function authorizeRegistryWrite_(registry, actor, now) {
    if (registry === null) {
      if (!legacyAdministrator_(actor)) {
        throw error_("ACCESS_CAPABILITY_DENIED", "Gestion des accès non autorisée.");
      }
      return;
    }
    var actorAccount = accountFor_(registry, actor, now);
    var context = {
      legacyBootstrap: false,
      account: actorAccount,
      now: now
    };
    if (!actorAccount ||
        !administrativeCapabilityAllowed_(context, "ACCESS_MANAGE")) {
      throw error_("ACCESS_CAPABILITY_DENIED", "Gestion des accès non autorisée.");
    }
  }

  function businessAccount_(account) {
    var copy = JSON.parse(JSON.stringify(account));
    delete copy.updatedAt;
    delete copy.updatedBy;
    return copy;
  }

  function stampChanges_(proposed, current, actor, now) {
    var currentByEmail = {};
    (current ? current.accounts : []).forEach(function (account) {
      currentByEmail[account.email] = account;
    });
    proposed.accounts.forEach(function (account) {
      var previous = currentByEmail[account.email];
      var unchanged = previous &&
        JSON.stringify(businessAccount_(previous)) ===
          JSON.stringify(businessAccount_(account));
      if (unchanged) {
        account.updatedAt = previous.updatedAt;
        account.updatedBy = previous.updatedBy;
      } else {
        account.updatedAt = now.toISOString();
        account.updatedBy = actor;
      }
      if (previous && previous.status === "INACTIVE" && account.status === "ACTIVE" &&
          account.assignments.length !== 0) {
        throw error_(
          "ACCESS_REGISTRY_INVALID",
          "Une réactivation doit repartir sans ancienne habilitation."
        );
      }
    });
    return proposed;
  }

  function assertActiveManagerRemains_(registry, now) {
    var managers = registry.accounts.filter(function (account) {
      return activeAt_(account, now) && administrativeCapabilityAllowed_({
        legacyBootstrap: false,
        account: account,
        now: now
      }, "ACCESS_MANAGE");
    });
    if (managers.length === 0) {
      throw error_(
        "ACCESS_LAST_MANAGER_REQUIRED",
        "Un gestionnaire d'accès actif est obligatoire."
      );
    }
  }

  function restoreRegistry_(previous) {
    try {
      if (previous === null) {
        if (!registryStore || typeof registryStore.clear !== "function") {
          throw error_("ACCESS_REGISTRY_RESTORE_FAILED", "Restauration du registre impossible.");
        }
        registryStore.clear();
      } else {
        registryStore.save(previous);
      }
      var restored = rawRegistry_();
      if (canonicalRegistry_(restored) !== canonicalRegistry_(previous)) {
        throw error_("ACCESS_REGISTRY_RESTORE_FAILED", "Restauration du registre incomplète.");
      }
    } catch (failure) {
      if (failure && failure.code === "ACCESS_REGISTRY_RESTORE_FAILED") throw failure;
      throw error_("ACCESS_REGISTRY_RESTORE_FAILED", "Restauration du registre impossible.");
    }
  }

  function persistRegistryAtomically_(proposed, previousRaw) {
    if (!registryStore || typeof registryStore.save !== "function") {
      throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès indisponible.");
    }
    try {
      registryStore.save(proposed);
      var persisted = loadedRegistry_();
      if (canonicalRegistry_(persisted) !== canonicalRegistry_(proposed)) {
        throw error_("ACCESS_REGISTRY_WRITE_FAILED", "Vérification du registre impossible.");
      }
    } catch (failure) {
      restoreRegistry_(previousRaw);
      if (failure && failure.code === "ACCESS_REGISTRY_WRITE_FAILED") throw failure;
      throw error_("ACCESS_REGISTRY_WRITE_FAILED", "Écriture du registre impossible.");
    }
  }

  function assertPersistentAudit_() {
    if (!audit || typeof audit.record !== "function" ||
        typeof audit.recordUnderExistingLock !== "function" ||
        typeof audit.isPersistentAuditAvailable !== "function" ||
        audit.isPersistentAuditAvailable() !== true) {
      throw error_("ACCESS_AUDIT_REQUIRED", "Audit persistant des accès indisponible.");
    }
  }

  function correlationId_() {
    var correlationId = String(correlationIdProvider() || "").trim();
    if (!/^corr-[A-Za-z0-9][A-Za-z0-9._:-]{2,95}$/.test(correlationId)) {
      throw error_("ACCESS_AUDIT_REQUIRED", "Corrélation d'audit des accès invalide.");
    }
    return correlationId;
  }

  function changedAccountIds_(before, after) {
    var beforeByEmail = {};
    var afterByEmail = {};
    (before ? before.accounts : []).forEach(function (account) {
      beforeByEmail[account.email] = businessAccount_(account);
    });
    (after ? after.accounts : []).forEach(function (account) {
      afterByEmail[account.email] = businessAccount_(account);
    });
    var emails = {};
    Object.keys(beforeByEmail).forEach(function (email) { emails[email] = true; });
    Object.keys(afterByEmail).forEach(function (email) { emails[email] = true; });
    return Object.keys(emails).filter(function (email) {
      return JSON.stringify(beforeByEmail[email] || null) !==
        JSON.stringify(afterByEmail[email] || null);
    }).sort();
  }

  function auditMetadata_(before, proposed, after, actor, restored, commandContext) {
    var changed = changedAccountIds_(before, proposed);
    var metadata = {
      beforeRevision: revisionFor_(before),
      proposedRevision: revisionFor_(proposed),
      afterRevision: revisionFor_(after),
      changedAccountIds: changed,
      changedCount: changed.length,
      selfModification: changed.indexOf(actor) !== -1,
      restored: restored === true
    };
    commandContext = commandContext || {};
    if (commandContext.requestId) metadata.requestId = commandContext.requestId;
    if (commandContext.operation) metadata.operation = commandContext.operation;
    if (commandContext.comment) metadata.comment = commandContext.comment;
    if (commandContext.sensitive === true) metadata.sensitive = true;
    if (commandContext.requestId) {
      metadata.rolesAdded = commandContext.rolesAdded;
      metadata.rolesRemoved = commandContext.rolesRemoved;
      metadata.assignmentsAdded = commandContext.assignmentsAdded;
      metadata.assignmentsRemoved = commandContext.assignmentsRemoved;
    }
    return metadata;
  }

  function recordRegistryAudit_(actor, correlationId, result, reasonCode,
      before, proposed, after, restored, lockAlreadyHeld, commandContext) {
    assertPersistentAudit_();
    var proof;
    try {
      var event = {
        actorType: result === "REFUSE" ? "USER" : "ADMIN",
        actor: actor,
        action: "ACCESS_REGISTRY_UPDATE",
        module: "ACCESS",
        criticality: "CRITICAL",
        targetType: "ACCESS_REGISTRY",
        targetId: "AKS_ACCESS_REGISTRY",
        result: result,
        reasonCode: reasonCode || "",
        correlationId: correlationId,
        metadata: auditMetadata_(before, proposed, after, actor, restored, commandContext)
      };
      proof = lockAlreadyHeld
        ? audit.recordUnderExistingLock(event)
        : audit.record(event);
    } catch (auditFailure) {
      throw error_("ACCESS_AUDIT_REQUIRED", "Preuve d'audit des accès indisponible.");
    }
    if (proof === false || proof === null || typeof proof === "undefined") {
      throw error_("ACCESS_AUDIT_REQUIRED", "Preuve d'audit des accès indisponible.");
    }
    return proof;
  }

  function recordRefusal_(actor, correlationId, failure, before, proposed,
      lockAlreadyHeld, commandContext) {
    try {
      recordRegistryAudit_(
        actor, correlationId, "REFUSE",
        failure && failure.code ? failure.code : "UNEXPECTED_ERROR",
        before, proposed || before, before, false, lockAlreadyHeld, commandContext
      );
    } catch (ignoredAuditFailure) {}
  }

  function updateRegistryForAdministration(command) {
    var actor = currentIdentity_();
    assertPersistentAudit_();
    var correlationId = correlationId_();
    var authorizationTime = now_();
    var initialRaw = rawRegistry_();
    var initial = initialRaw === null ? null : normalizeRegistry_(initialRaw);
    var proposed = null;
    var commandContext = {};
    try {
      commandContext = normalizeAuditContext_(command && command.auditContext);
      authorizeRegistryWrite_(initial, actor, authorizationTime);
      if (!command || typeof command !== "object" ||
          typeof command.expectedRevision !== "string" ||
          !command.expectedRevision.trim() || !command.registry) {
        throw error_("ACCESS_COMMAND_INVALID", "Commande de modification invalide.");
      }
      proposed = normalizeRegistry_(command.registry);
      // A legacy registry may still be read as-is, but no write may persist a
      // shape that is invalid once stamped with the canonical access/1.2 schema.
      proposed = normalizeRegistry_(proposed);
      assertExplicitCapabilityCoherence_(proposed);
      validateRegistryScopes_(proposed, authorizationTime);
    } catch (failure) {
      recordRefusal_(actor, correlationId, failure, initial, proposed, false, commandContext);
      throw failure;
    }
    var lock;
    try {
      lock = acquireRegistryLock_();
    } catch (lockFailure) {
      recordRefusal_(actor, correlationId, lockFailure, initial, proposed, false, commandContext);
      throw lockFailure;
    }
    try {
      var currentRaw = rawRegistry_();
      var current = currentRaw === null ? null : normalizeRegistry_(currentRaw);
      var now = now_();
      try {
        authorizeRegistryWrite_(current, actor, now);
        if (command.expectedRevision !== revisionFor_(current)) {
          throw error_("ACCESS_REGISTRY_CONFLICT", "Le registre a été modifié entre-temps.");
        }
        validateRegistryScopes_(proposed, now);
        assertExplicitCapabilityCoherence_(proposed);
        proposed = stampChanges_(proposed, current, actor, now);
        assertActiveManagerRemains_(proposed, now);
      } catch (validationFailure) {
        recordRefusal_(actor, correlationId, validationFailure, current, proposed, true,
          commandContext);
        throw validationFailure;
      }
      recordRegistryAudit_(
        actor, correlationId, "INTENTION", "", current, proposed, proposed, false, true,
        commandContext
      );
      try {
        persistRegistryAtomically_(proposed, currentRaw);
      } catch (persistenceFailure) {
        try {
          recordRegistryAudit_(
            actor, correlationId, "ECHEC", persistenceFailure.code,
            current, proposed, current, true, true, commandContext
          );
        } catch (ignoredAuditFailure) {}
        throw persistenceFailure;
      }
      try {
        recordRegistryAudit_(
          actor, correlationId, "REUSSI", "", current, proposed, proposed, false, true,
          commandContext
        );
      } catch (successAuditFailure) {
        restoreRegistry_(currentRaw);
        try {
          recordRegistryAudit_(
            actor, correlationId, "ECHEC", "ACCESS_AUDIT_REQUIRED",
            current, proposed, current, true, true, commandContext
          );
        } catch (ignoredFinalAuditFailure) {}
        throw error_("ACCESS_AUDIT_REQUIRED", "Preuve finale des accès indisponible.");
      }
      return immutableCopy_({
        schemaVersion: SCHEMA_VERSION,
        accounts: proposed.accounts,
        bootstrap: false,
        revision: revisionFor_(proposed),
        correlationId: correlationId
      });
    } finally {
      lock.releaseLock();
    }
  }

  function previewRegistryForAdministration(command) {
    var actor = currentIdentity_();
    var now = now_();
    var current = loadedRegistry_();
    authorizeRegistryWrite_(current, actor, now);
    if (!command || typeof command !== "object" ||
        typeof command.expectedRevision !== "string" ||
        !command.expectedRevision.trim() || !command.registry) {
      throw error_("ACCESS_COMMAND_INVALID", "Commande de prévisualisation invalide.");
    }
    if (command.expectedRevision !== revisionFor_(current)) {
      throw error_("ACCESS_REGISTRY_CONFLICT", "Le registre a été modifié entre-temps.");
    }
    var proposed = normalizeRegistry_(command.registry);
    proposed = normalizeRegistry_(proposed);
    assertExplicitCapabilityCoherence_(proposed);
    validateRegistryScopes_(proposed, now);
    assertActiveManagerRemains_(proposed, now);
    return immutableCopy_({
      schemaVersion: SCHEMA_VERSION,
      accounts: proposed.accounts,
      revision: revisionFor_(current),
      proposedRevision: revisionFor_(proposed)
    });
  }

  function recordAdministrativeRefusalForAdministration(reasonCode) {
    var actor = currentIdentity_();
    assertPersistentAudit_();
    var correlationId = correlationId_();
    var before = loadedRegistry_();
    recordRegistryAudit_(
      actor, correlationId, "REFUSE", upper_(reasonCode),
      before, before, before, false, false
    );
    return immutableCopy_({ correlationId: correlationId });
  }

  function capabilitiesFor_(context, courseCode, season) {
    if (context.legacyBootstrap) {
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

  function effectiveAccessSnapshot() {
    var context = context_();
    if (context.legacyBootstrap) {
      return immutableCopy_({
        email: context.email, roles: [], assignments: [], bootstrap: true
      });
    }
    return immutableCopy_({
      email: context.email,
      roles: context.account.roles.slice(),
      assignments: context.account.assignments.filter(function (assignment) {
        return activeAt_(assignment, context.now) && assignment.roles.some(function (role) {
          return context.account.roles.indexOf(role) !== -1;
        });
      }).map(function (assignment) {
        var capabilities = {};
        if (!assignment.module) {
          assignment.roles.forEach(function (role) {
            if (context.account.roles.indexOf(role) === -1) return;
            ROLE_CAPABILITIES[role].forEach(function (capability) {
              capabilities[capability] = true;
            });
          });
        }
        assignment.extraCapabilities.forEach(function (capability) {
          capabilities[capability] = true;
        });
        return {
          module: assignment.module || "ATTENDANCE",
          season: assignment.season,
          section: assignment.section || "",
          courseCode: assignment.courseCode || "",
          validFrom: assignment.validFrom || "",
          validUntil: assignment.validUntil || "",
          capabilities: Object.keys(capabilities).sort()
        };
      }),
      bootstrap: false
    });
  }

  function saveRegistry(registry) {
    var current = loadedRegistry_();
    var result;
    try {
      result = updateRegistryForAdministration({
        expectedRevision: revisionFor_(current),
        registry: registry
      });
    } catch (failure) {
      if (failure && failure.code === "ACCESS_LAST_MANAGER_REQUIRED") {
        throw error_("ACCESS_REGISTRY_INVALID", "Un administrateur actif est obligatoire.");
      }
      throw failure;
    }
    return immutableCopy_({ schemaVersion: result.schemaVersion, accounts: result.accounts });
  }

  return Object.freeze({
    getCapabilityCatalogue: function () { return Object.freeze(Object.keys(CAPABILITIES)); },
    getCurrentIdentity: currentIdentity_,
    listAuthorizedCourses: listAuthorizedCourses,
    hasCapability: hasCapability,
    assertCapability: assertCapability,
    assertAnalyticsCapability: assertAnalyticsCapability,
    assertInscriptionsCapability: assertInscriptionsCapability,
    assertAdministrativeCapability: assertAdministrativeCapability,
    assertAdministrationCapability: assertAdministrationCapability,
    readRegistryForAdministration: readRegistryForAdministration,
    previewRegistryForAdministration: previewRegistryForAdministration,
    updateRegistryForAdministration: updateRegistryForAdministration,
    recordAdministrativeRefusalForAdministration:
      recordAdministrativeRefusalForAdministration,
    getEffectiveAccessContext: effectiveContext,
    getEffectiveAccessSnapshot: effectiveAccessSnapshot,
    saveRegistry: saveRegistry
  });
}

AKS.Core.Access = Object.freeze({
  create: AKS_createAccessService_
});
