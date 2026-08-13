var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/** ACCESS-002-03 minimal account lifecycle commands. */
function AKS_createAccessAccountLifecycleService_(options) {
  "use strict";

  options = options || {};
  var accessAdmin = options.accessAdmin ||
    (AKS.Core.AccessAdmin && typeof AKS.Core.AccessAdmin.create === "function"
      ? AKS.Core.AccessAdmin.create()
      : null);
  var ROLES = {
    ADMINISTRATEUR: true, ASSISTANT_AFA: true,
    CONSULTATION: true, PROFESSEUR: true
  };

  function failure_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  if (!accessAdmin || typeof accessAdmin.readRegistry !== "function" ||
      typeof accessAdmin.updateRegistry !== "function" ||
      typeof accessAdmin.recordRefusal !== "function") {
    throw failure_("ACCESS_ADMIN_UNAVAILABLE", "Gestion des comptes indisponible.");
  }

  function lower_(value) {
    return String(value || "").trim().toLowerCase();
  }

  function upper_(value) {
    return String(value || "").trim().toUpperCase();
  }

  function immutableCopy_(value) {
    function freeze_(entry) {
      if (!entry || typeof entry !== "object" || Object.isFrozen(entry)) return entry;
      Object.keys(entry).forEach(function (key) { freeze_(entry[key]); });
      return Object.freeze(entry);
    }
    return freeze_(JSON.parse(JSON.stringify(value)));
  }

  function reject_(code, message) {
    try { accessAdmin.recordRefusal(code); } catch (ignoredAuditFailure) {}
    throw failure_(code, message);
  }

  function baseCommand_(command) {
    if (!command || typeof command !== "object" || Array.isArray(command)) {
      reject_("ACCESS_COMMAND_INVALID", "Commande de compte invalide.");
    }
    var accountId = lower_(command.accountId || command.email);
    var expectedRevision = String(command.expectedRevision || "").trim();
    var requestId = String(command.requestId || "").trim();
    if (!accountId || accountId.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountId) ||
        !expectedRevision ||
        !/^req-[A-Za-z0-9][A-Za-z0-9._:-]{2,95}$/.test(requestId)) {
      reject_("ACCESS_COMMAND_INVALID", "Commande de compte invalide.");
    }
    return {
      accountId: accountId,
      expectedRevision: expectedRevision,
      requestId: requestId
    };
  }

  function registryView_() {
    var view = accessAdmin.readRegistry();
    if (!view || !Array.isArray(view.accounts) ||
        typeof view.revision !== "string" || !view.revision) {
      throw failure_("ACCESS_ADMIN_UNAVAILABLE", "Registre des comptes indisponible.");
    }
    return view;
  }

  function indexFor_(accounts, accountId) {
    for (var index = 0; index < accounts.length; index += 1) {
      if (lower_(accounts[index].email) === accountId) return index;
    }
    return -1;
  }

  function assertRevision_(request, view) {
    if (request.expectedRevision !== view.revision) {
      reject_("ACCESS_REGISTRY_CONFLICT", "Le registre a été modifié entre-temps.");
    }
  }

  function result_(action, changed, request, view, account) {
    return immutableCopy_({
      action: action,
      changed: changed,
      requestId: request.requestId,
      accountId: request.accountId,
      revision: view.revision,
      correlationId: String(view.correlationId || ""),
      account: account
    });
  }

  function update_(action, request, view, accounts, account) {
    var updated = accessAdmin.updateRegistry({
      expectedRevision: request.expectedRevision,
      auditContext: { requestId: request.requestId, operation: action },
      registry: { schemaVersion: "access/1.0", accounts: accounts }
    });
    var updatedIndex = indexFor_(updated.accounts, request.accountId);
    return result_(action, true, request, updated,
      updatedIndex === -1 ? account : updated.accounts[updatedIndex]);
  }

  function createAccount(command) {
    var request = baseCommand_(command);
    var displayName = String(command.displayName || "").trim();
    var role = upper_(command.role);
    if (!displayName || displayName.length > 200 || !ROLES[role]) {
      reject_("ACCESS_COMMAND_INVALID", "Création de compte invalide.");
    }
    var view = registryView_();
    assertRevision_(request, view);
    if (indexFor_(view.accounts, request.accountId) !== -1) {
      reject_("ACCESS_ACCOUNT_EXISTS", "Ce compte existe déjà.");
    }
    var account = {
      email: request.accountId,
      displayName: displayName,
      status: "INACTIVE",
      roles: [role],
      assignments: []
    };
    return update_("CREATE", request, view, view.accounts.concat([account]), account);
  }

  function deactivateAccount(command) {
    var request = baseCommand_(command);
    var view = registryView_();
    assertRevision_(request, view);
    var accounts = JSON.parse(JSON.stringify(view.accounts));
    var index = indexFor_(accounts, request.accountId);
    if (index === -1) {
      reject_("ACCESS_ACCOUNT_NOT_FOUND", "Compte introuvable.");
    }
    if (accounts[index].status === "INACTIVE") {
      return result_("DEACTIVATE", false, request, view, accounts[index]);
    }
    accounts[index].status = "INACTIVE";
    return update_("DEACTIVATE", request, view, accounts, accounts[index]);
  }

  function reactivateAccount(command) {
    var request = baseCommand_(command);
    var view = registryView_();
    assertRevision_(request, view);
    var accounts = JSON.parse(JSON.stringify(view.accounts));
    var index = indexFor_(accounts, request.accountId);
    if (index === -1) {
      reject_("ACCESS_ACCOUNT_NOT_FOUND", "Compte introuvable.");
    }
    if (accounts[index].status === "ACTIVE") {
      return result_("REACTIVATE", false, request, view, accounts[index]);
    }
    if (accounts[index].assignments.length > 0 && command.clearAssignments !== true) {
      reject_("ACCESS_ASSIGNMENTS_CLEAR_REQUIRED",
        "La réactivation exige l'effacement confirmé des anciennes habilitations.");
    }
    accounts[index].assignments = [];
    accounts[index].status = "ACTIVE";
    return update_("REACTIVATE", request, view, accounts, accounts[index]);
  }

  return Object.freeze({
    createAccount: createAccount,
    deactivateAccount: deactivateAccount,
    reactivateAccount: reactivateAccount
  });
}

AKS.Core.AccessAccountLifecycle = Object.freeze({
  create: AKS_createAccessAccountLifecycleService_
});
