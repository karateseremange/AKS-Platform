var AKS = AKS || {};
AKS.Core = AKS.Core || {};

AKS.Core.Application = (function () {
  var started = false;

  function start() {
    if (started) {
      return AKS.Core.Result.success({ started: true, alreadyStarted: true });
    }

    AKS.Core.Services.register("logger", AKS.Core.Logger);
    AKS.Core.Modules.register({
      id: "health-questionnaire",
      name: "Questionnaire santé",
      version: "0.1.0",
      status: "planned"
    });

    started = true;
    AKS.Core.Logger.info("AKS Platform started.", {
      modules: AKS.Core.Modules.list().length
    });

    return AKS.Core.Result.success({ started: true, alreadyStarted: false });
  }

  function isStarted() {
    return started;
  }

  function resetForTests() {
    started = false;
  }

  return Object.freeze({
    start: start,
    isStarted: isStarted,
    resetForTests: resetForTests
  });
})();
