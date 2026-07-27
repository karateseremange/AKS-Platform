var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.Analytics = AKS.Modules.Analytics || {};

/**
 * Declares AKS Analytics as an active application module.
 *
 * Operational services remain owned by the existing Analytics components.
 * This descriptor only publishes module metadata and administration
 * navigation through the standard application contract.
 */
AKS.Modules.Analytics.Module = Object.freeze({
  id: "analytics",
  name: "AKS Analytics",
  version: "0.1.0",
  status: "active",

  getDescriptor: function () {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: this.status
    };
  },

  getAdminNavigationEntries: function () {
    return [{
      id: "module.analytics",
      label: "Analytics",
      family: "modules",
      target: "?app=analytics",
      available: true,
      authorized: true,
      external: false,
      priority: 10,
      quickAction: true
    }];
  },

  install: function () {}
});
