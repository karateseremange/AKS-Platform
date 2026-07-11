function test_ApplicationLifecycle_start() {
  AKS.Core.Application.resetForTests();

  var result = AKS.Core.Application.start();

  assertTrue_(
    result.ok,
    "Application start should succeed."
  );

  assertEquals_(
    AKS.Core.Application.STATE_READY,
    AKS.Core.Application.getState(),
    "Application should be ready."
  );

  assertTrue_(
    AKS.Core.Services.has("logger"),
    "Logger service should be registered."
  );

  assertTrue_(
    AKS.Core.Modules.has("health-questionnaire"),
    "Health questionnaire module should be loaded."
  );
}

function test_ApplicationLifecycle_startIsIdempotent() {
  AKS.Core.Application.resetForTests();

  var first = AKS.Core.Application.start();
  var second = AKS.Core.Application.start();

  assertTrue_(first.ok, "First start should succeed.");
  assertTrue_(second.ok, "Second start should succeed.");

  assertTrue_(
    second.data.alreadyStarted,
    "Second start should be idempotent."
  );
}

function test_ApplicationLifecycle_moduleLoaderRejectsInvalidDefinition() {
  AKS.Core.Application.resetForTests();

  assertThrows_(
    function () {
      AKS.Core.ModuleLoader.load([{}]);
    },
    "MODULE_DEFINITION_INVALID"
  );
}
