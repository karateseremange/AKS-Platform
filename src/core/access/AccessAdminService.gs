var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ACCESS-002 administration boundary.
 *
 * This first boundary is deliberately read-only. Authorization and registry
 * normalization remain server-side in AccessService so no caller can bypass
 * ACCESS_MANAGE or obtain the raw persistent object.
 */
function AKS_createAccessAdminService_(options) {
  "use strict";

  options = options || {};
  var accessService = options.accessService ||
    (typeof AKS_createAccessService_ === "function" ? AKS_createAccessService_() : null);

  if (!accessService ||
      typeof accessService.readRegistryForAdministration !== "function") {
    var failure = new Error("Service d'administration des accès indisponible.");
    failure.code = "ACCESS_ADMIN_UNAVAILABLE";
    throw failure;
  }

  return Object.freeze({
    readRegistry: function () {
      return accessService.readRegistryForAdministration();
    }
  });
}

AKS.Core.AccessAdmin = Object.freeze({
  create: AKS_createAccessAdminService_
});
