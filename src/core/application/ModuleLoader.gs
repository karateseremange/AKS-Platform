var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Loads module descriptors into the module registry.
 */
AKS.Core.ModuleLoader = Object.freeze({
  /**
   * @param {Array<Object>} modules
   * @returns {Array<Object>}
   */
  load: function (modules) {
    if (!Array.isArray(modules)) {
      throw new AKS.Core.Exception(
        "MODULE_LIST_REQUIRED",
        "A module list is required."
      );
    }

    return modules.map(function (moduleDefinition) {
      if (
        !moduleDefinition ||
        typeof moduleDefinition.getDescriptor !== "function"
      ) {
        throw new AKS.Core.Exception(
          "MODULE_DEFINITION_INVALID",
          "A module definition must expose getDescriptor()."
        );
      }

      return AKS.Core.Modules.register(
        moduleDefinition.getDescriptor()
      );
    });
  }
});
