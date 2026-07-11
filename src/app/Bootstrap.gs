var AKS = AKS || {};
AKS.App = AKS.App || {};

/**
 * Declares the modules available to the application.
 *
 * The bootstrap layer is the only place where concrete modules are listed.
 */
AKS.App.Bootstrap = Object.freeze({
  getModules: function () {
    return [
      AKS.Modules.HealthQuestionnaire.Module
    ];
  }
});
