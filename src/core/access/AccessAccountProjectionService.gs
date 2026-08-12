var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ACCESS-002-03 read-only account projection.
 *
 * The persistent registry remains private to AccessService. This component
 * receives the immutable administrative view, derives effective access on the
 * server date and returns only the fields required by the account list.
 */
function AKS_createAccessAccountProjectionService_(options) {
  "use strict";

  options = options || {};
  var accessAdmin = options.accessAdmin ||
    (AKS.Core.AccessAdmin && typeof AKS.Core.AccessAdmin.create === "function"
      ? AKS.Core.AccessAdmin.create()
      : null);
  var clock = options.clock || function () { return new Date(); };
  var ROLES = ["ADMINISTRATEUR", "ASSISTANT_AFA", "CONSULTATION", "PROFESSEUR"];
  var MODULES = ["ACCESS", "ANALYTICS", "ATTENDANCE", "INSCRIPTIONS"];
  var STATUSES = ["ACTIVE", "INACTIVE"];
  var TEMPORAL_STATES = ["EFFECTIVE", "FUTURE", "EXPIRED", "WITHOUT_ASSIGNMENT"];

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  if (!accessAdmin || typeof accessAdmin.readRegistry !== "function") {
    throw error_("ACCESS_ADMIN_UNAVAILABLE", "Consultation des comptes indisponible.");
  }

  function upper_(value) {
    return String(value || "").trim().toUpperCase();
  }

  function lower_(value) {
    return String(value || "").trim().toLowerCase();
  }

  function immutableCopy_(value) {
    function freeze_(entry) {
      if (!entry || typeof entry !== "object" || Object.isFrozen(entry)) return entry;
      Object.keys(entry).forEach(function (key) { freeze_(entry[key]); });
      return Object.freeze(entry);
    }
    return freeze_(JSON.parse(JSON.stringify(value)));
  }

  function normalizedChoice_(value, allowed, field) {
    var normalized = upper_(value) || "ALL";
    if (normalized !== "ALL" && allowed.indexOf(normalized) === -1) {
      throw error_("ACCESS_QUERY_INVALID", "Filtre " + field + " invalide.");
    }
    return normalized;
  }

  function normalizeQuery_(query) {
    query = query || {};
    if (typeof query !== "object" || Array.isArray(query)) {
      throw error_("ACCESS_QUERY_INVALID", "Critères de consultation invalides.");
    }
    var search = lower_(query.search);
    if (search.length > 200) {
      throw error_("ACCESS_QUERY_INVALID", "Recherche trop longue.");
    }
    return {
      search: search,
      status: normalizedChoice_(query.status, STATUSES, "statut"),
      role: normalizedChoice_(query.role, ROLES, "rôle"),
      module: normalizedChoice_(query.module, MODULES, "module"),
      temporalState: normalizedChoice_(
        query.temporalState, TEMPORAL_STATES, "temporel")
    };
  }

  function now_() {
    var now = clock();
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw error_("ACCESS_PROJECTION_UNAVAILABLE", "Date de consultation invalide.");
    }
    return now;
  }

  function dateState_(record, today) {
    if (record && record.validFrom && record.validFrom > today) return "FUTURE";
    if (record && record.validUntil && record.validUntil < today) return "EXPIRED";
    return "CURRENT";
  }

  function rolesIntersect_(account, assignment) {
    return (assignment.roles || []).some(function (role) {
      return (account.roles || []).indexOf(role) !== -1;
    });
  }

  function assignmentState_(account, assignment, today) {
    var accountDateState = dateState_(account, today);
    var assignmentDateState = dateState_(assignment, today);
    if (accountDateState === "FUTURE" || assignmentDateState === "FUTURE") {
      return "FUTURE";
    }
    if (accountDateState === "EXPIRED" || assignmentDateState === "EXPIRED") {
      return "EXPIRED";
    }
    if (account.status !== "ACTIVE" || assignment.status !== "ACTIVE" ||
        !rolesIntersect_(account, assignment)) {
      return "INACTIVE";
    }
    return "EFFECTIVE";
  }

  function modulesFor_(assignment) {
    var modules = {};
    if (assignment.module === "ACCESS") modules.ACCESS = true;
    if (assignment.module === "INSCRIPTIONS") modules.INSCRIPTIONS = true;
    if (!assignment.module && assignment.courseCode) modules.ATTENDANCE = true;
    (assignment.extraCapabilities || []).forEach(function (capability) {
      if (String(capability).indexOf("ANALYTICS_") === 0) modules.ANALYTICS = true;
    });
    return Object.keys(modules).sort();
  }

  function temporalState_(account, states, today) {
    if (account.status !== "ACTIVE") return "INACTIVE";
    var accountDateState = dateState_(account, today);
    if (accountDateState !== "CURRENT") return accountDateState;
    if (states.length === 0) return "WITHOUT_ASSIGNMENT";
    if (states.indexOf("EFFECTIVE") !== -1) return "EFFECTIVE";
    if (states.indexOf("FUTURE") !== -1) return "FUTURE";
    if (states.indexOf("EXPIRED") !== -1) return "EXPIRED";
    return "INACTIVE";
  }

  function projectAccount_(account, today) {
    var assignments = Array.isArray(account.assignments) ? account.assignments : [];
    var states = assignments.map(function (assignment) {
      return assignmentState_(account, assignment, today);
    });
    var effectiveModules = {};
    assignments.forEach(function (assignment, index) {
      if (states[index] !== "EFFECTIVE") return;
      modulesFor_(assignment).forEach(function (module) { effectiveModules[module] = true; });
    });
    return {
      accountId: lower_(account.email),
      displayName: String(account.displayName || "").trim(),
      status: upper_(account.status),
      roles: (account.roles || []).slice().sort(),
      assignmentCount: assignments.length,
      effectiveAssignmentCount: states.filter(function (state) {
        return state === "EFFECTIVE";
      }).length,
      effectiveModules: Object.keys(effectiveModules).sort(),
      temporalState: temporalState_(account, states, today),
      accessManager: Object.prototype.hasOwnProperty.call(effectiveModules, "ACCESS"),
      updatedAt: String(account.updatedAt || "").trim(),
      updatedBy: lower_(account.updatedBy)
    };
  }

  function compareText_(left, right) {
    return left < right ? -1 : (left > right ? 1 : 0);
  }

  function sortAccounts_(left, right) {
    if (left.status !== right.status) return left.status === "ACTIVE" ? -1 : 1;
    var displayDifference = compareText_(lower_(left.displayName), lower_(right.displayName));
    return displayDifference || compareText_(left.accountId, right.accountId);
  }

  function matches_(account, query) {
    var searchable = lower_(account.displayName + " " + account.accountId);
    return (!query.search || searchable.indexOf(query.search) !== -1) &&
      (query.status === "ALL" || account.status === query.status) &&
      (query.role === "ALL" || account.roles.indexOf(query.role) !== -1) &&
      (query.module === "ALL" || account.effectiveModules.indexOf(query.module) !== -1) &&
      (query.temporalState === "ALL" || account.temporalState === query.temporalState);
  }

  function listAccounts(query) {
    var normalizedQuery = normalizeQuery_(query);
    var now = now_();
    var view = accessAdmin.readRegistry();
    if (!view || !Array.isArray(view.accounts) || typeof view.revision !== "string") {
      throw error_("ACCESS_PROJECTION_UNAVAILABLE", "Registre des comptes indisponible.");
    }
    var accounts = view.accounts.map(function (account) {
      return projectAccount_(account, now.toISOString().slice(0, 10));
    }).sort(sortAccounts_);
    var results = accounts.filter(function (account) {
      return matches_(account, normalizedQuery);
    });
    return immutableCopy_({
      revision: view.revision,
      bootstrap: view.bootstrap === true,
      generatedAt: now.toISOString(),
      query: normalizedQuery,
      totalCount: accounts.length,
      resultCount: results.length,
      accounts: results
    });
  }

  return Object.freeze({ listAccounts: listAccounts });
}

AKS.Core.AccessAccountProjection = Object.freeze({
  create: AKS_createAccessAccountProjectionService_
});
