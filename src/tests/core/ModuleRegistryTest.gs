function test_ModuleRegistry_registerAndGet() {
  AKS.Core.Modules.clear();
  var module = AKS.Core.Modules.register({ id: "sample", name: "Sample" });
  assertTrue_(AKS.Core.Modules.has("sample"), "Module should exist.");
  assertEquals_("sample", module.id, "Module id should match.");
  assertEquals_("Sample", AKS.Core.Modules.get("sample").name, "Module name should match.");
}

function test_ModuleRegistry_rejectsInvalidDescriptor() {
  AKS.Core.Modules.clear();
  assertThrows_(function () {
    AKS.Core.Modules.register({ id: "sample" });
  }, "MODULE_NAME_REQUIRED");
}
