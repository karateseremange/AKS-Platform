var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/** ACCESS-002-04 minimized account detail and pure access preview. */
function AKS_createAccessAccountDetailService_(options) {
  "use strict";
  options = options || {};
  var accessAdmin = options.accessAdmin;
  var catalogueProvider = options.catalogueProvider || AKS.Core.AccessModelCatalogue;

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  if (!accessAdmin || typeof accessAdmin.readRegistry !== "function" ||
      typeof accessAdmin.previewRegistry !== "function" ||
      typeof accessAdmin.updateRegistry !== "function" ||
      typeof accessAdmin.getCurrentIdentity !== "function" ||
      typeof accessAdmin.recordRefusal !== "function" ||
      !catalogueProvider || typeof catalogueProvider.get !== "function") {
    throw error_("ACCESS_DETAIL_UNAVAILABLE", "Fiche des accès indisponible.");
  }

  function lower_(value) { return String(value || "").trim().toLowerCase(); }
  function upper_(value) { return String(value || "").trim().toUpperCase(); }
  function immutable_(value) {
    function freeze_(entry) {
      if (!entry || typeof entry !== "object" || Object.isFrozen(entry)) return entry;
      Object.keys(entry).forEach(function (key) { freeze_(entry[key]); });
      return Object.freeze(entry);
    }
    return freeze_(JSON.parse(JSON.stringify(value)));
  }
  function accountId_(value) {
    var id = lower_(value);
    if (!id || id.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
      throw error_("ACCESS_ACCOUNT_ID_INVALID", "Identifiant de compte invalide.");
    }
    return id;
  }
  function account_(view, id) {
    var matches = view.accounts.filter(function (entry) { return entry.email === id; });
    if (matches.length !== 1) {
      throw error_("ACCESS_ACCOUNT_NOT_FOUND", "Compte d'accès introuvable.");
    }
    return matches[0];
  }
  function publicAssignment_(assignment) {
    return {
      module: assignment.module || "ATTENDANCE",
      season: assignment.season,
      section: assignment.section || "",
      courseCode: assignment.courseCode || "",
      status: assignment.status,
      roles: assignment.roles.slice(),
      capabilities: assignment.extraCapabilities.slice(),
      validFrom: assignment.validFrom || "",
      validUntil: assignment.validUntil || ""
    };
  }
  function detail_(view, target) {
    return {
      revision: view.revision,
      schemaVersion: view.schemaVersion,
      account: {
        accountId: target.email,
        displayName: target.displayName,
        status: target.status,
        roles: target.roles.slice(),
        assignments: target.assignments.map(publicAssignment_),
        updatedAt: target.updatedAt,
        updatedBy: target.updatedBy,
        editable: target.status === "ACTIVE"
      },
      catalogues: catalogueProvider.get()
    };
  }
  function storageAssignment_(assignment) {
    assignment = assignment || {};
    var module = upper_(assignment.module);
    return {
      module: module === "ATTENDANCE" ? "" : module,
      season: String(assignment.season || "").trim(),
      section: upper_(assignment.section),
      courseCode: upper_(assignment.courseCode),
      status: upper_(assignment.status),
      roles: (assignment.roles || []).map(upper_),
      extraCapabilities: (assignment.capabilities || []).map(upper_),
      validFrom: String(assignment.validFrom || "").trim(),
      validUntil: String(assignment.validUntil || "").trim()
    };
  }
  function key_(assignment) { return JSON.stringify(publicAssignment_(assignment)); }
  function difference_(left, right) {
    return left.filter(function (value) { return right.indexOf(value) === -1; }).sort();
  }
  function reject_(code, message) {
    try { accessAdmin.recordRefusal(code); } catch (ignoredAuditFailure) {}
    throw error_(code, message);
  }
  function proposedAccounts_(view, id, command) {
    var accounts = JSON.parse(JSON.stringify(view.accounts));
    var proposed = account_({ accounts: accounts }, id);
    proposed.roles = command.roles.map(upper_);
    proposed.assignments = command.assignments.map(storageAssignment_);
    return accounts;
  }
  function manageChanged_(summary) {
    return summary.assignmentsAdded.concat(summary.assignmentsRemoved).some(function (entry) {
      return entry.module === "ACCESS" &&
        entry.capabilities.indexOf("ACCESS_MANAGE") !== -1;
    });
  }

  function getAccountDetail(accountId) {
    var id = accountId_(accountId);
    var view = accessAdmin.readRegistry();
    return immutable_(detail_(view, account_(view, id)));
  }

  function previewAccountAccess(command) {
    if (!command || typeof command !== "object" || Array.isArray(command) ||
        !Array.isArray(command.roles) || !Array.isArray(command.assignments)) {
      throw error_("ACCESS_COMMAND_INVALID", "Commande de prévisualisation invalide.");
    }
    var id = accountId_(command.accountId);
    var view = accessAdmin.readRegistry();
    if (String(command.expectedRevision || "") !== view.revision) {
      throw error_("ACCESS_REGISTRY_CONFLICT", "Le registre a été modifié entre-temps.");
    }
    var before = account_(view, id);
    if (before.status !== "ACTIVE") {
      throw error_("ACCESS_ACCOUNT_INACTIVE", "Un compte inactif est non modifiable.");
    }
    var proposedAccounts = proposedAccounts_(view, id, command);
    var validated = accessAdmin.previewRegistry({
      expectedRevision: view.revision,
      registry: { schemaVersion: "access/1.1", accounts: proposedAccounts }
    });
    var after = account_(validated, id);
    var beforeAssignments = before.assignments.map(key_).sort();
    var afterAssignments = after.assignments.map(key_).sort();
    var beforeRoles = before.roles.slice().sort();
    var afterRoles = after.roles.slice().sort();
    return immutable_({
      revision: view.revision,
      proposedRevision: validated.proposedRevision,
      accountId: id,
      changed: JSON.stringify(beforeRoles) !== JSON.stringify(afterRoles) ||
        JSON.stringify(beforeAssignments) !== JSON.stringify(afterAssignments),
      summary: {
        rolesAdded: difference_(afterRoles, beforeRoles),
        rolesRemoved: difference_(beforeRoles, afterRoles),
        assignmentsAdded: difference_(afterAssignments, beforeAssignments).map(function (value) {
          return JSON.parse(value);
        }),
        assignmentsRemoved: difference_(beforeAssignments, afterAssignments).map(function (value) {
          return JSON.parse(value);
        })
      },
      proposed: detail_({ revision: view.revision, schemaVersion: "access/1.1" }, after).account
    });
  }

  function saveAccountAccess(command) {
    var requestId = String(command && command.requestId || "").trim();
    var comment = String(command && command.comment || "").trim().replace(/\s+/g, " ");
    if (!/^req-[A-Za-z0-9][A-Za-z0-9._:-]{2,95}$/.test(requestId) ||
        comment.length > 500) {
      reject_("ACCESS_COMMAND_INVALID", "Commande d'enregistrement invalide.");
    }
    var preview = previewAccountAccess(command);
    if (!preview.changed) {
      reject_("ACCESS_NO_CHANGE", "Aucune modification à enregistrer.");
    }
    var actor = lower_(accessAdmin.getCurrentIdentity());
    var sensitive = actor === preview.accountId || manageChanged_(preview.summary);
    if (sensitive && command.confirmSensitive !== true) {
      reject_("ACCESS_SENSITIVE_CONFIRMATION_REQUIRED",
        "Une confirmation renforcée est obligatoire.");
    }
    var view = accessAdmin.readRegistry();
    if (view.revision !== preview.revision) {
      reject_("ACCESS_REGISTRY_CONFLICT", "Le registre a été modifié entre-temps.");
    }
    var updated = accessAdmin.updateRegistry({
      expectedRevision: view.revision,
      auditContext: {
        requestId: requestId,
        operation: "SAVE_ACCOUNT_ACCESS",
        comment: comment,
        sensitive: sensitive
      },
      registry: {
        schemaVersion: "access/1.1",
        accounts: proposedAccounts_(view, preview.accountId, command)
      }
    });
    return immutable_({
      action: "SAVE_ACCOUNT_ACCESS",
      changed: true,
      requestId: requestId,
      accountId: preview.accountId,
      revision: updated.revision,
      correlationId: updated.correlationId,
      sensitive: sensitive,
      summary: preview.summary,
      account: detail_(updated, account_(updated, preview.accountId)).account
    });
  }

  return Object.freeze({
    getAccountDetail: getAccountDetail,
    previewAccountAccess: previewAccountAccess,
    saveAccountAccess: saveAccountAccess
  });
}

AKS.Core.AccessAccountDetail = Object.freeze({ create: AKS_createAccessAccountDetailService_ });
