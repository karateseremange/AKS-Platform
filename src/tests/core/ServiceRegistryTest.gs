function test_ServiceRegistry_registerAndGet() {
  AKS.Core.Services.clear();
  var service = { value: 42 };
  AKS.Core.Services.register("sample", service);
  assertTrue_(AKS.Core.Services.has("sample"), "Service should exist.");
  assertSame_(service, AKS.Core.Services.get("sample"), "Stored service should be returned.");
}

function test_ServiceRegistry_rejectsDuplicate() {
  AKS.Core.Services.clear();
  AKS.Core.Services.register("sample", {});
  assertThrows_(function () {
    AKS.Core.Services.register("sample", {});
  }, "SERVICE_ALREADY_REGISTERED");
}
