var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Compatibility facade over AKS.Core.Container.
 *
 * New code should use AKS.Core.Container directly.
 */
AKS.Core.Services = Object.freeze({
  register: function (name, service) {
    return AKS.Core.Container.register(name, service);
  },

  get: function (name) {
    return AKS.Core.Container.resolve(name);
  },

  has: function (name) {
    return AKS.Core.Container.has(name);
  },

  list: function () {
    return AKS.Core.Container.list();
  },

  clear: function () {
    AKS.Core.Container.clear();
  }
});
