function test_HQ0052Sprint31_upgradeInstallsModuleDependencies() {
  AKS.Core.Application.resetForTests();

  var installResult = AKS_install();

  assertTrue_(installResult.ok);
  assertTrue_(
    AKS.Core.Container.has("healthQuestionnaire.repository")
  );
  assertTrue_(
    AKS.Core.Container.has("healthQuestionnaire.settings")
  );
}
