var AKS = AKS || {};

/**
 * Centralized AKS Platform V1.1 validation suite.
 *
 * Runs the verified VERSION-001, ADMIN-001, DASHBOARD-001, ADMIN-004,
 * ADMIN-003, ADMIN-002, ADMIN-005, CONFIG-001, LOG-001, UX-001 and Analytics
 * foundation tests and emits
 * a consolidated execution report in the Apps Script logs.
 */
function AKS_runValidationSuiteV11() {
  return AKS_runNamedTestSuite_("AKS Platform V1.1", [
    { name: "VERSION-001 / API exists", test: AKS_testVersion001ApiExists_ },
    { name: "VERSION-001 / release structure", test: AKS_testVersion001ReleaseInfoStructure_ },
    { name: "VERSION-001 / immutable release info", test: AKS_testVersion001ReleaseInfoIsImmutable_ },
    { name: "VERSION-001 / defensive copies", test: AKS_testVersion001ReturnsDefensiveCopies_ },
    { name: "VERSION-001 / invalid provider", test: AKS_testVersion001RejectsInvalidProvider_ },
    { name: "VERSION-001 / invalid provider result", test: AKS_testVersion001RejectsInvalidProviderResult_ },
    { name: "VERSION-001 / string normalization", test: AKS_testVersion001NormalizesRequiredStrings_ },

    { name: "ADMIN-001 / configured administrator", test: AKS_testAdminDashboard_authorizesConfiguredAdministrator },
    { name: "ADMIN-001 / unknown administrator", test: AKS_testAdminDashboard_rejectsUnknownAdministrator },
    { name: "ADMIN-001 / empty authorization list", test: AKS_testAdminDashboard_rejectsEmptyInjectedAuthorizationList },
    { name: "ADMIN-001 / declarative view model", test: AKS_testAdminDashboard_buildsDeclarativeViewModel },
    { name: "ADMIN-001 / no legacy codename", test: AKS_testAdminDashboard_doesNotExposeLegacyCodenameProperty },
    { name: "ADMIN-001 / immutable release data", test: AKS_testAdminDashboard_keepsReleaseDataImmutable },

    { name: "DASHBOARD-001 / API exists", test: AKS_testDashboard001ApiExists_ },
    { name: "DASHBOARD-001 / nominal model", test: AKS_testDashboard001BuildsNominalModel_ },
    { name: "DASHBOARD-001 / access denied propagation", test: AKS_testDashboard001PropagatesAccessDenied_ },
    { name: "DASHBOARD-001 / fail closed", test: AKS_testDashboard001FailsClosedWithoutAccessApi_ },
    { name: "DASHBOARD-001 / degraded version", test: AKS_testDashboard001ReturnsPartialModelWithoutVersion_ },
    { name: "DASHBOARD-001 / degraded configuration", test: AKS_testDashboard001ReturnsPartialModelWithoutConfiguration_ },
    { name: "DASHBOARD-001 / incomplete logger", test: AKS_testDashboard001DetectsIncompleteLoggerApi_ },
    { name: "DASHBOARD-001 / deep immutability", test: AKS_testDashboard001ModelIsDeeplyImmutable_ },
    { name: "DASHBOARD-001 / defensive copies", test: AKS_testDashboard001ReturnsDefensiveCopies_ },

    { name: "ADMIN-004 / public contracts", test: AKS_testAdmin004PublicContractsExist_ },
    { name: "ADMIN-004 / valid provider", test: AKS_testAdmin004RegistersValidProvider_ },
    { name: "ADMIN-004 / duplicate provider", test: AKS_testAdmin004RejectsDuplicateProvider_ },
    { name: "ADMIN-004 / unsupported contract", test: AKS_testAdmin004RejectsUnsupportedContract_ },
    { name: "ADMIN-004 / disabled provider", test: AKS_testAdmin004ExcludesDisabledProvider_ },
    { name: "ADMIN-004 / executable content", test: AKS_testAdmin004RejectsExecutableWidgetContent_ },
    { name: "ADMIN-004 / empty state", test: AKS_testAdmin004AcceptsEmptyWidget_ },
    { name: "ADMIN-004 / unavailable state", test: AKS_testAdmin004AcceptsUnavailableWidget_ },
    { name: "ADMIN-004 / provider isolation", test: AKS_testAdmin004IsolatesProviderFailure_ },
    { name: "ADMIN-004 / stable order", test: AKS_testAdmin004SortsWidgetsStably_ },

    { name: "ADMIN-003 / four zones", test: AKS_testAdmin003ExposesFourZones_ },
    { name: "ADMIN-003 / zone composition", test: AKS_testAdmin003GroupsWidgetsByZone_ },
    { name: "ADMIN-003 / normalized states", test: AKS_testAdmin003PreservesNormalizedStates_ },
    { name: "ADMIN-003 / no global health", test: AKS_testAdmin003DoesNotDeriveGlobalHealth_ },
    { name: "ADMIN-003 / freshness", test: AKS_testAdmin003PreservesFreshness_ },
    { name: "ADMIN-003 / defensive copies", test: AKS_testAdmin003CreatesDefensiveZoneCopies_ },
    { name: "ADMIN-003 / dashboard model", test: AKS_testAdmin003DashboardHasNoGlobalHealth_ },
    { name: "ADMIN-003 / isolated degradation", test: AKS_testAdmin003IsolatesUnavailableCard_ },

    { name: "ADMIN-002 / stable family order", test: AKS_testAdmin002KeepsStableFamilyOrder_ },
    { name: "ADMIN-002 / unavailable destination", test: AKS_testAdmin002HidesUnavailableDestinations_ },
    { name: "ADMIN-002 / unauthorized destination", test: AKS_testAdmin002HidesUnauthorizedDestinations_ },
    { name: "ADMIN-002 / safe targets", test: AKS_testAdmin002RejectsUnsafeTargets_ },
    { name: "ADMIN-002 / external link", test: AKS_testAdmin002IdentifiesExternalLinks_ },
    { name: "ADMIN-002 / dashboard return", test: AKS_testAdmin002ExposesDashboardReturn_ },
    { name: "ADMIN-002 / active modules", test: AKS_testAdmin002PublishesOnlyActiveModules_ },
    { name: "ADMIN-002 / immutable model", test: AKS_testAdmin002CreatesImmutableDefensiveModel_ },

    { name: "ADMIN-005 / authorized access", test: AKS_testAdmin005AcceptsAuthorizedAccess_ },
    { name: "ADMIN-005 / unauthorized access", test: AKS_testAdmin005RejectsUnauthorizedAccess_ },
    { name: "ADMIN-005 / zero providers", test: AKS_testAdmin005SupportsZeroProviders_ },
    { name: "ADMIN-005 / multiple providers and widgets", test: AKS_testAdmin005SupportsMultipleProvidersAndWidgets_ },
    { name: "ADMIN-005 / server-side authorization", test: AKS_testAdmin005FiltersUnauthorizedDataServerSide_ },
    { name: "ADMIN-005 / failure isolation and safe logging", test: AKS_testAdmin005IsolatesAndLogsProviderFailure_ },
    { name: "ADMIN-005 / invalid contract", test: AKS_testAdmin005RejectsInvalidContractWithoutGlobalFailure_ },
    { name: "ADMIN-005 / no fictitious destination", test: AKS_testAdmin005ExposesNoFictitiousDestination_ },

    { name: "CONFIG-001 / immutable definition", test: AKS_testConfig001_registersImmutableDefinition_ },
    { name: "CONFIG-001 / duplicate key", test: AKS_testConfig001_rejectsDuplicateKey_ },
    { name: "CONFIG-001 / stable key convention", test: AKS_testConfig001_rejectsInvalidKey_ },
    { name: "CONFIG-001 / secret separation", test: AKS_testConfig001_rejectsSecretValue_ },
    { name: "CONFIG-001 / explicit value", test: AKS_testConfig001_resolvesExplicitValue_ },
    { name: "CONFIG-001 / documented default", test: AKS_testConfig001_resolvesDocumentedDefault_ },
    { name: "CONFIG-001 / required value", test: AKS_testConfig001_rejectsMissingRequiredValue_ },
    { name: "CONFIG-001 / service validation", test: AKS_testConfig001_rejectsInvalidExplicitValue_ },
    { name: "CONFIG-001 / persistent typed value", test: AKS_testConfig001_persistsTypedValue_ },
    { name: "CONFIG-001 / validate before persistence", test: AKS_testConfig001_rejectsInvalidValueBeforePersistence_ },
    { name: "CONFIG-001 / administrable write", test: AKS_testConfig001_rejectsNonAdministrableWrite_ },
    { name: "CONFIG-001 / mutation actor", test: AKS_testConfig001_requiresMutationActor_ },
    { name: "CONFIG-001 / restore default", test: AKS_testConfig001_removesExplicitValueAndRestoresDefault_ },
    { name: "CONFIG-001 / required delete protection", test: AKS_testConfig001_protectsRequiredValueFromDeletion_ },
    { name: "CONFIG-001 / corrupted persistence", test: AKS_testConfig001_detectsCorruptedPersistentValue_ },
    { name: "CONFIG-001 / persistence lock release", test: AKS_testConfig001_releasesPersistenceLockAfterFailure_ },
    { name: "CONFIG-001 / authorized administration model", test: AKS_testConfig001AdminUi_buildsAuthorizedViewModel_ },
    { name: "CONFIG-001 / administration access denied", test: AKS_testConfig001AdminUi_rejectsUnauthorizedUser_ },
    { name: "CONFIG-001 / invalid required parameter status", test: AKS_testConfig001AdminUi_reportsInvalidRequiredParameter_ },
    { name: "CONFIG-001 / read-only parameter", test: AKS_testConfig001AdminUi_marksReadOnlyParameter_ },
    { name: "CONFIG-001 / authenticated mutation actor", test: AKS_testConfig001AdminUi_usesAuthenticatedActor_ },
    { name: "CONFIG-001 / administration restores default", test: AKS_testConfig001AdminUi_restoresDefault_ },
    { name: "CONFIG-001 / administration navigation", test: AKS_testConfig001AdminUi_publishesNavigationDestination_ },
    { name: "CONFIG-001 / sensitive value masking", test: AKS_testConfig001AdminUi_masksSensitiveValue_ },

    { name: "LOG-001 / structured immutable event", test: AKS_testLog001_buildsStructuredImmutableEvent_ },
    { name: "LOG-001 / correlation propagation", test: AKS_testLog001_propagatesValidCorrelationId_ },
    { name: "LOG-001 / invalid correlation replacement", test: AKS_testLog001_replacesInvalidCorrelationId_ },
    { name: "LOG-001 / masking before provider", test: AKS_testLog001_masksSensitiveDataBeforeProvider_ },
    { name: "LOG-001 / invalid level", test: AKS_testLog001_rejectsUnknownLevel_ },
    { name: "LOG-001 / invalid category", test: AKS_testLog001_rejectsUnknownCategory_ },
    { name: "LOG-001 / required event type", test: AKS_testLog001_requiresStableEventType_ },
    { name: "LOG-001 / provider failure isolation", test: AKS_testLog001_isolatesProviderFailure_ },
    { name: "LOG-001 / dedicated persistent storage", test: AKS_testLog001Repository_createsDedicatedStorage_ },
    { name: "LOG-001 / complete event persistence", test: AKS_testLog001Repository_persistsCompleteEvent_ },
    { name: "LOG-001 / recent event ordering", test: AKS_testLog001Repository_readsNewestEventsFirst_ },
    { name: "LOG-001 / storage schema integrity", test: AKS_testLog001Repository_rejectsIncompatibleSchema_ },
    { name: "LOG-001 / storage lock timeout", test: AKS_testLog001Repository_rejectsUnavailableLock_ },
    { name: "LOG-001 / lock release after failure", test: AKS_testLog001Repository_releasesLockAfterFailure_ },
    { name: "LOG-001 / core logger persistent pipeline", test: AKS_testLog001CoreLogger_delegatesToPersistentPipeline_ },
    { name: "LOG-001 / retention default", test: AKS_testLog001Retention_registersNinetyDayDefault_ },
    { name: "LOG-001 / expired rows purge", test: AKS_testLog001Retention_purgesExpiredRowsOnly_ },
    { name: "LOG-001 / purge batch limit", test: AKS_testLog001Retention_respectsBatchLimit_ },
    { name: "LOG-001 / invalid retention policy", test: AKS_testLog001Retention_rejectsInvalidPolicy_ },
    { name: "LOG-001 / controlled purge trace", test: AKS_testLog001Retention_tracesControlledPurge_ },
    { name: "LOG-001 / consultation authorization", test: AKS_testLog001Admin_rejectsUnauthorizedReadBeforeStorage_ },
    { name: "LOG-001 / controlled filters", test: AKS_testLog001Admin_normalizesControlledFilters_ },
    { name: "LOG-001 / filtered recent events", test: AKS_testLog001Admin_filtersAndLimitsRecentEvents_ },
    { name: "LOG-001 / masked read-only details", test: AKS_testLog001Admin_presentsMaskedDetailsReadOnly_ },
    { name: "LOG-001 / consultation navigation", test: AKS_testLog001Admin_buildsReadOnlyNavigation_ },
    { name: "LOG-001 / dashboard storage degradation", test: AKS_testLog001Admin_dashboardDegradesWithoutStorage_ },

    { name: "UX-001 / shared administration foundation", test: AKS_testUx001AdminViewsUseSharedFoundation_ },
    { name: "UX-001 / visible keyboard focus", test: AKS_testUx001ProvidesVisibleKeyboardFocus_ },
    { name: "UX-001 / accessible action targets", test: AKS_testUx001ProvidesAccessibleActionTargets_ },
    { name: "UX-001 / explicit disabled state", test: AKS_testUx001ProvidesExplicitDisabledState_ },
    { name: "UX-001 / reduced motion preference", test: AKS_testUx001RespectsReducedMotionPreference_ },
    { name: "UX-001 / duplicate configuration actions", test: AKS_testUx001ConfigurationPreventsDuplicateActions_ },
    { name: "UX-001 / pending configuration feedback", test: AKS_testUx001ConfigurationAnnouncesPendingAction_ },
    { name: "UX-001 / configuration failure recovery", test: AKS_testUx001ConfigurationRecoversAfterFailure_ },
    { name: "UX-001 / controlled configuration error", test: AKS_testUx001ConfigurationHidesTechnicalFailureDetails_ },
    { name: "UX-001 / filtered log result model", test: AKS_testUx001LogModelDescribesFilteredResults_ },
    { name: "UX-001 / announced log result count", test: AKS_testUx001LogViewAnnouncesResultCount_ },
    { name: "UX-001 / filtered empty log recovery", test: AKS_testUx001FilteredEmptyLogViewOffersReset_ },
    { name: "UX-001 / readable log metadata model", test: AKS_testUx001LogModelPresentsReadableEventMetadata_ },
    { name: "UX-001 / readable log event view", test: AKS_testUx001LogViewUsesReadableEventMetadata_ },
    { name: "UX-001 / readable dashboard event view", test: AKS_testUx001DashboardUsesReadableEventMetadata_ },

    { name: "ANALYTICS / corpus GOLD-001 à GOLD-010", test: AKS_testAnalyticsGoldDatasets_coverValidatedCorpus_ },
    { name: "ANALYTICS / immutabilité profonde", test: AKS_testAnalyticsGoldDatasets_areDeeplyImmutable_ },
    { name: "ANALYTICS / reproductibilité", test: AKS_testAnalyticsGoldDatasets_areReproducible_ },
    { name: "ANALYTICS / comparaison récursive", test: AKS_testAnalyticsGoldDatasetComparator_reportsPrecisePath_ }
  ]);
}

/**
 * Executes one named suite while continuing after individual failures.
 * Throws a final consolidated error when at least one test fails.
 *
 * @param {string} suiteName
 * @param {Array<{name: string, test: Function}>} testCases
 * @returns {{suite: string, total: number, passed: number, failed: number}}
 */
function AKS_runNamedTestSuite_(suiteName, testCases) {
  var startedAt = new Date();
  var failures = [];
  var passed = 0;

  Logger.log("============================================================");
  Logger.log("SUITE: " + suiteName);
  Logger.log("Démarrage: " + startedAt.toISOString());
  Logger.log("============================================================");

  testCases.forEach(function (testCase, index) {
    var label = "[" + (index + 1) + "/" + testCases.length + "] " + testCase.name;

    try {
      if (typeof testCase.test !== "function") {
        throw new Error("Fonction de test introuvable.");
      }

      testCase.test();
      passed += 1;
      Logger.log("OK   " + label);
    } catch (error) {
      var message = error && error.message ? error.message : String(error);
      failures.push({ name: testCase.name, message: message });
      Logger.log("ECHEC " + label + " — " + message);
    }
  });

  var report = Object.freeze({
    suite: suiteName,
    total: testCases.length,
    passed: passed,
    failed: failures.length
  });

  Logger.log("============================================================");
  Logger.log(
    "RÉSULTAT: " + report.passed + "/" + report.total +
    " réussis, " + report.failed + " échec(s)."
  );
  Logger.log("Durée: " + (new Date().getTime() - startedAt.getTime()) + " ms");
  Logger.log("============================================================");

  if (failures.length > 0) {
    var details = failures.map(function (failure, index) {
      return (index + 1) + ". " + failure.name + " — " + failure.message;
    }).join("\n");

    throw new Error(
      "La suite " + suiteName + " contient " + failures.length +
      " échec(s).\n" + details
    );
  }

  return report;
}
