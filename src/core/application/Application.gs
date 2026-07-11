var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Manages the AKS Platform lifecycle.
 */
AKS.Core.Application = (function () {
  var STATE_STOPPED = "STOPPED";
  var STATE_STARTING = "STARTING";
  var STATE_READY = "READY";
  var STATE_FAILED = "FAILED";

  var state = STATE_STOPPED;

  function start() {
    if (state === STATE_READY) {
      return AKS.Core.Result.success({
        state: state,
        alreadyStarted: true
      });
    }

    state = STATE_STARTING;

    try {
      registerCoreDependencies_();

      AKS.Core.ModuleLoader.load(
        AKS.App.Bootstrap.getModules()
      );

      state = STATE_READY;

      AKS.Core.Container.resolve("logger").info(
        "AKS Platform started.",
        {
          state: state,
          modules: AKS.Core.Modules.list().length,
          dependencies: AKS.Core.Container.list().length
        }
      );

      return AKS.Core.Result.success({
        state: state,
        alreadyStarted: false
      });
    } catch (error) {
      state = STATE_FAILED;

      if (AKS.Core.Container && AKS.Core.Container.has("logger")) {
        AKS.Core.Container.resolve("logger").error(
          "AKS Platform startup failed.",
          error
        );
      }

      return AKS.Core.Result.failure(
        error && error.code ? error.code : "APPLICATION_START_FAILED",
        error && error.message ? error.message : String(error)
      );
    }
  }

  function install() {
    var startResult = start();

    if (!startResult.ok) {
      return startResult;
    }

    var modules = AKS.Core.Modules.list();

    modules.forEach(function (moduleDescriptor) {
      var moduleDefinition = findModuleDefinition_(moduleDescriptor.id);

      if (
        moduleDefinition &&
        typeof moduleDefinition.install === "function"
      ) {
        moduleDefinition.install();
      }
    });

    AKS.Core.Container.resolve("logger").info(
      "AKS Platform installed.",
      { modules: modules.length }
    );

    return AKS.Core.Result.success({
      state: state,
      installedModules: modules.length
    });
  }

  function open() {
    var result = start();

    if (!result.ok) {
      return result;
    }

    AKS.App.Menu.build();
    return result;
  }

  function getState() {
    return state;
  }

  function resetForTests() {
    state = STATE_STOPPED;
    AKS.Core.Container.clear();
    AKS.Core.Modules.clear();
  }

  function registerCoreDependencies_() {
    if (!AKS.Core.Container.has("logger")) {
      AKS.Core.Container.register(
        "logger",
        AKS.Core.Logger
      );
    }
  }

  function findModuleDefinition_(moduleId) {
    var modules = AKS.App.Bootstrap.getModules();

    for (var index = 0; index < modules.length; index += 1) {
      if (
        modules[index] &&
        modules[index].getDescriptor().id === moduleId
      ) {
        return modules[index];
      }
    }

    return null;
  }

  return Object.freeze({
    STATE_STOPPED: STATE_STOPPED,
    STATE_STARTING: STATE_STARTING,
    STATE_READY: STATE_READY,
    STATE_FAILED: STATE_FAILED,
    start: start,
    install: install,
    open: open,
    getState: getState,
    resetForTests: resetForTests
  });
})();
