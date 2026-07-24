var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates an isolated ADMIN-004 provider registry.
 *
 * @param {Object} contract
 * @returns {Object}
 */
function AKS_createDashboardProviderRegistry_(contract) {
  var providers = {};

  function createError_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function register(provider) {
    var metadata = contract.validateProvider(provider);
    var providerId = metadata.providerId;

    if (Object.prototype.hasOwnProperty.call(providers, providerId)) {
      throw createError_(
        "ADMIN004_DUPLICATE_IDENTIFIER",
        "Le fournisseur " + providerId + " est déjà enregistré."
      );
    }

    providers[providerId] = {
      provider: provider,
      metadata: metadata
    };
    return provider;
  }

  function get(providerId) {
    return Object.prototype.hasOwnProperty.call(providers, providerId)
      ? providers[providerId].provider
      : null;
  }

  function list() {
    return Object.keys(providers).sort().map(function (providerId) {
      return providers[providerId].provider;
    });
  }

  function listEnabled() {
    return Object.keys(providers).sort().filter(function (providerId) {
      return providers[providerId].metadata.enabled;
    }).map(function (providerId) {
      return providers[providerId].provider;
    });
  }

  function clear() {
    providers = {};
  }

  return Object.freeze({
    register: register,
    get: get,
    list: list,
    listEnabled: listEnabled,
    clear: clear
  });
}

AKS.Core.DashboardProviders = AKS_createDashboardProviderRegistry_(
  AKS.Core.DashboardContract
);
