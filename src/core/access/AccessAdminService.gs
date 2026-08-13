var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ACCESS-002 administration boundary.
 *
 * Authorization, validation and registry normalization remain server-side in
 * AccessService so no caller can bypass ACCESS_MANAGE or obtain the raw
 * persistent object. Writes use an optimistic revision supplied by the last
 * administrative read.
 */
function AKS_createAccessAdminService_(options) {
  "use strict";

  options = options || {};
  var accessService = options.accessService ||
    (typeof AKS_createAccessService_ === "function" ? AKS_createAccessService_() : null);

  if (!accessService ||
      typeof accessService.readRegistryForAdministration !== "function" ||
      typeof accessService.updateRegistryForAdministration !== "function" ||
      typeof accessService.recordAdministrativeRefusalForAdministration !== "function") {
    var failure = new Error("Service d'administration des accès indisponible.");
    failure.code = "ACCESS_ADMIN_UNAVAILABLE";
    throw failure;
  }

  return Object.freeze({
    readRegistry: function () {
      return accessService.readRegistryForAdministration();
    },

    updateRegistry: function (command) {
      return accessService.updateRegistryForAdministration(command);
    },

    recordRefusal: function (reasonCode) {
      return accessService.recordAdministrativeRefusalForAdministration(reasonCode);
    }
  });
}

AKS.Core.AccessAdmin = Object.freeze({
  create: AKS_createAccessAdminService_
});
