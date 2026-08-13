var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/** ACCESS-002-04 minimized, paginated functional history from AUDIT proofs. */
function AKS_createAccessAccountHistoryService_(options) {
  "use strict";
  options = options || {};
  var accessService = options.accessService;
  var gateway = options.gateway;
  var catalogs = options.catalogs || AKS.Core.AuditCatalogs;
  var PAGE_SIZE = 20;

  function error_(code, message) {
    var failure = new Error(message); failure.code = code; return failure;
  }
  if (!accessService || typeof accessService.assertAdministrativeCapability !== "function" ||
      !gateway || typeof gateway.getHeaders !== "function" ||
      typeof gateway.listRows !== "function" || !catalogs) {
    throw error_("ACCESS_HISTORY_UNAVAILABLE", "Historique des accès indisponible.");
  }
  function lower_(value) { return String(value || "").trim().toLowerCase(); }
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
  function offset_(cursor) {
    if (!cursor) return 0;
    var match = /^access-history\/1\/([0-9]+)$/.exec(String(cursor));
    if (!match || Number(match[1]) > 1000000) {
      throw error_("ACCESS_HISTORY_CURSOR_INVALID", "Curseur d'historique invalide.");
    }
    return Number(match[1]);
  }
  function maskActor_(value) {
    var actor = lower_(value), parts = actor.split("@");
    if (parts.length !== 2) return "Compte masqué";
    return (parts[0].slice(0, 1) || "*") + "***@" + parts[1];
  }
  function objectRow_(headers, row) {
    var result = {};
    headers.forEach(function (header, index) { result[header] = String(row[index] || ""); });
    return result;
  }
  function metadata_(json) {
    try {
      var value = JSON.parse(json || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (failure) { return {}; }
  }
  function historyEntry_(row, metadata) {
    return {
      occurredAt: row.occurred_at,
      actor: maskActor_(row.actor_id),
      result: row.result,
      operation: String(metadata.operation || "ACCESS_REGISTRY_UPDATE"),
      comment: String(metadata.comment || ""),
      summary: {
        rolesAdded: Array.isArray(metadata.rolesAdded) ? metadata.rolesAdded.slice() : [],
        rolesRemoved: Array.isArray(metadata.rolesRemoved) ? metadata.rolesRemoved.slice() : [],
        assignmentsAdded: Number(metadata.assignmentsAdded || 0),
        assignmentsRemoved: Number(metadata.assignmentsRemoved || 0),
        restored: metadata.restored === true
      }
    };
  }

  function getAccountHistory(accountId, cursor) {
    accessService.assertAdministrativeCapability("ACCESS_MANAGE");
    var id = accountId_(accountId);
    var offset = offset_(cursor);
    var headers = gateway.getHeaders().map(String);
    if (JSON.stringify(headers) !== JSON.stringify(catalogs.headers)) {
      throw error_("ACCESS_HISTORY_UNAVAILABLE", "Schéma d'historique incompatible.");
    }
    var entries = gateway.listRows().map(function (row) {
      return objectRow_(headers, row);
    }).filter(function (row) {
      if (row.action !== "ACCESS_REGISTRY_UPDATE") return false;
      var metadata = metadata_(row.metadata_json);
      return Array.isArray(metadata.changedAccountIds) &&
        metadata.changedAccountIds.indexOf(id) !== -1;
    }).sort(function (left, right) {
      return left.occurred_at < right.occurred_at ? 1 :
        (left.occurred_at > right.occurred_at ? -1 : 0);
    });
    var page = entries.slice(offset, offset + PAGE_SIZE).map(function (row) {
      return historyEntry_(row, metadata_(row.metadata_json));
    });
    var nextOffset = offset + page.length;
    return immutable_({
      accountId: id,
      entries: page,
      nextCursor: nextOffset < entries.length ? "access-history/1/" + nextOffset : "",
      hasMore: nextOffset < entries.length
    });
  }

  return Object.freeze({ getAccountHistory: getAccountHistory });
}

AKS.Core.AccessAccountHistory = Object.freeze({
  create: AKS_createAccessAccountHistoryService_
});
