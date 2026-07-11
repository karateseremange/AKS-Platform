function test_Application_start() {
  AKS.Core.Services.clear();
  AKS.Core.Modules.clear();
  AKS.Core.Application.resetForTests();
  var result = AKS.Core.Application.start();
  assertTrue_(result.ok, "Application start should succeed.");
  assertTrue_(AKS.Core.Application.isStarted(), "Application should be started.");
  assertTrue_(AKS.Core.Services.has("logger"), "Logger service should be registered.");
  assertTrue_(AKS.Core.Modules.has("health-questionnaire"), "Health questionnaire module should be registered.");
}

function test_Application_start_isIdempotent() {
  AKS.Core.Services.clear();
  AKS.Core.Modules.clear();
  AKS.Core.Application.resetForTests();
  var first = AKS.Core.Application.start();
  var second = AKS.Core.Application.start();
  assertTrue_(first.ok, "First start should succeed.");
  assertTrue_(second.ok, "Second start should succeed.");
  assertTrue_(second.data.alreadyStarted, "Second start should be idempotent.");
}
