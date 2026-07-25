function AKS_runLogger001Tests() {
  var tests = [
    AKS_testLogger_exposesStablePublicApi,
    AKS_testLogger_acceptsCallsWithoutContext,
    AKS_testLogger_acceptsOptionalContext,
    AKS_testLogger_delegatesToInternalProvider,
    AKS_testLog001_buildsStructuredImmutableEvent_,
    AKS_testLog001_propagatesValidCorrelationId_,
    AKS_testLog001_replacesInvalidCorrelationId_,
    AKS_testLog001_masksSensitiveDataBeforeProvider_,
    AKS_testLog001_rejectsUnknownLevel_,
    AKS_testLog001_rejectsUnknownCategory_,
    AKS_testLog001_requiresStableEventType_,
    AKS_testLog001_isolatesProviderFailure_,
    AKS_testLog001Repository_createsDedicatedStorage_,
    AKS_testLog001Repository_persistsCompleteEvent_,
    AKS_testLog001Repository_readsNewestEventsFirst_,
    AKS_testLog001Repository_rejectsIncompatibleSchema_,
    AKS_testLog001Repository_rejectsUnavailableLock_,
    AKS_testLog001Repository_releasesLockAfterFailure_,
    AKS_testLog001CoreLogger_delegatesToPersistentPipeline_,
    AKS_testLog001Retention_registersNinetyDayDefault_,
    AKS_testLog001Retention_purgesExpiredRowsOnly_,
    AKS_testLog001Retention_respectsBatchLimit_,
    AKS_testLog001Retention_rejectsInvalidPolicy_,
    AKS_testLog001Retention_tracesControlledPurge_,
    AKS_testLog001Admin_rejectsUnauthorizedReadBeforeStorage_,
    AKS_testLog001Admin_normalizesControlledFilters_,
    AKS_testLog001Admin_filtersAndLimitsRecentEvents_,
    AKS_testLog001Admin_presentsMaskedDetailsReadOnly_,
    AKS_testLog001Admin_buildsReadOnlyNavigation_,
    AKS_testLog001Admin_dashboardDegradesWithoutStorage_
  ];
  var passed = 0;
  var results = [];

  tests.forEach(function (testCase) {
    testCase();
    passed += 1;
    results.push({
      name: testCase.name,
      status: "PASSED"
    });
  });

  var report = {
    ok: true,
    feature: "LOGGER-001",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
