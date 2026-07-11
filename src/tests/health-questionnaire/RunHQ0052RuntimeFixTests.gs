function AKS_runHQ0052RuntimeFixTests() {
  var result = AKS.Tests.runSuite("HQ-005.2 Runtime Fix", [
    AKS.Tests.HealthQuestionnaireWebRuntimeFix.run
  ]);
  Logger.log(JSON.stringify(result));
  return result;
}
