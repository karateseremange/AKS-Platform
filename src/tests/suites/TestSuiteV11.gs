var AKS = AKS || {};

/**
 * Centralized AKS Platform V1.1 validation suite.
 *
 * Runs the verified VERSION-001, ADMIN-001, DASHBOARD-001, ADMIN-004,
 * ADMIN-003, ADMIN-002, ADMIN-005, CONFIG-001, LOG-001, UX-001 and Analytics
 * foundation tests and emits
 * a consolidated execution report in the Apps Script logs.
 */
function AKS_testSuiteV11_includesRealAuditPreflightCoverage_() {
  var source = AKS_runValidationSuiteV11.toString();
  [
    "AKS_testAccess002Recipe_mapsAuditValidationFailureWithoutWrite_",
    "AKS_testAudit001_validatesPersistentRecipeSupportWithoutWrite_",
    "AKS_testAudit001_rejectsInvalidPersistentRecipeSupportWithoutWrite_",
    "AKS_testAudit001Recipe_connectsPersistentSupportWithoutAuditWrite_",
    "AKS_testAudit001Recipe_connectionIsIdempotent_",
    "AKS_testAudit001Recipe_disconnectRestoresExactConfiguration_",
    "AKS_testAudit001Recipe_refusesDisconnectBeforeAccessRestore_",
    "AKS_testAudit001Recipe_recoversPartialConnectionRestore_"
  ].forEach(function (testName) {
    assertTrue_(source.indexOf(testName) !== -1,
      "Test critique absent de la suite cumulative : " + testName);
  });
}

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
    { name: "ANALYTICS / comparaison récursive", test: AKS_testAnalyticsGoldDatasetComparator_reportsPrecisePath_ },

    { name: "ANALYTICS / modèle canonique", test: AKS_testAnalyticsNormalizer_exposesCanonicalModel_ },
    { name: "ANALYTICS / statuts historiques", test: AKS_testAnalyticsNormalizer_normalizesLegacyStatuses_ },
    { name: "ANALYTICS / statut inconnu", test: AKS_testAnalyticsNormalizer_rejectsUnknownStatus_ },
    { name: "ANALYTICS / éligibilité temporelle", test: AKS_testAnalyticsNormalizer_appliesTemporalEligibility_ },
    { name: "ANALYTICS / identifiants licencié", test: AKS_testAnalyticsNormalizer_validatesMemberIdentifiers_ },
    { name: "ANALYTICS / séance non réalisée", test: AKS_testAnalyticsNormalizer_excludesNonPerformedSessions_ },
    { name: "ANALYTICS / cours féminin historique", test: AKS_testAnalyticsNormalizer_excludesHistoricalWomensCourse_ },
    { name: "ANALYTICS / version de schéma", test: AKS_testAnalyticsNormalizer_rejectsUnknownSchema_ },
    { name: "ANALYTICS / pureté et déterminisme", test: AKS_testAnalyticsNormalizer_isPureAndDeterministic_ },
    { name: "ANALYTICS / conformité jeux d'or", test: AKS_testAnalyticsNormalizer_matchesGoldDatasets_ },

    { name: "ANALYTICS / ensemble nominal", test: AKS_testAnalyticsConsolidator_acceptsNominalSet_ },
    { name: "ANALYTICS / doublons identiques", test: AKS_testAnalyticsConsolidator_neutralizesIdenticalDuplicates_ },
    { name: "ANALYTICS / contradictions rejetées", test: AKS_testAnalyticsConsolidator_rejectsEntireConflictingGroup_ },
    { name: "ANALYTICS / clé métier présence", test: AKS_testAnalyticsConsolidator_usesBusinessAttendanceKey_ },
    { name: "ANALYTICS / numéro fédéral partagé", test: AKS_testAnalyticsConsolidator_detectsSharedLicenceNumber_ },
    { name: "ANALYTICS / identité licencie_id", test: AKS_testAnalyticsConsolidator_keepsLicencieIdAsIdentity_ },
    { name: "ANALYTICS / indépendance à l'ordre", test: AKS_testAnalyticsConsolidator_isOrderIndependent_ },
    { name: "ANALYTICS / idempotence", test: AKS_testAnalyticsConsolidator_isIdempotent_ },
    { name: "ANALYTICS / absence de mutation", test: AKS_testAnalyticsConsolidator_doesNotMutateInput_ },
    { name: "ANALYTICS / agrégation diagnostics", test: AKS_testAnalyticsConsolidator_aggregatesDiagnostics_ },

    { name: "ANALYTICS / participation séance", test: AKS_testAnalyticsIndicators_calculatesSessionParticipation_ },
    { name: "ANALYTICS / couverture partielle", test: AKS_testAnalyticsIndicators_marksIncompleteCoverage_ },
    { name: "ANALYTICS / dénominateur nul", test: AKS_testAnalyticsIndicators_returnsNonCalculableWithoutKnownStatus_ },
    { name: "ANALYTICS / assiduité individuelle", test: AKS_testAnalyticsIndicators_calculatesIndividualAssiduity_ },
    { name: "ANALYTICS / excusé au dénominateur", test: AKS_testAnalyticsIndicators_countsExcusedInDenominator_ },
    { name: "ANALYTICS / exclusions séance et éligibilité", test: AKS_testAnalyticsIndicators_excludesIneligibleAndCancelledRows_ },
    { name: "ANALYTICS / exclusion cours féminin", test: AKS_testAnalyticsIndicators_excludesHistoricalWomensCourse_ },
    { name: "ANALYTICS / agrégation pondérée", test: AKS_testAnalyticsIndicators_usesWeightedAggregations_ },
    { name: "ANALYTICS / indicateurs désactivés", test: AKS_testAnalyticsIndicators_exposesDisabledIndicatorsWithoutScore_ },
    { name: "ANALYTICS / déterminisme et immutabilité", test: AKS_testAnalyticsIndicators_isDeterministicAndDeeplyImmutable_ },

    { name: "ANALYTICS / cours indépendants", test: AKS_testAnalyticsOrchestrator_processesCoursesIndependently_ },
    { name: "ANALYTICS / isolation d'un échec", test: AKS_testAnalyticsOrchestrator_isolatesCourseFailure_ },
    { name: "ANALYTICS / résultat partiel exploitable", test: AKS_testAnalyticsOrchestrator_preservesPartialCourse_ },
    { name: "ANALYTICS / cours attendu absent", test: AKS_testAnalyticsOrchestrator_reportsMissingExpectedCourse_ },
    { name: "ANALYTICS / orchestration cours féminin", test: AKS_testAnalyticsOrchestrator_excludesHistoricalWomensCourse_ },
    { name: "ANALYTICS / aucun cours exploitable", test: AKS_testAnalyticsOrchestrator_returnsErrorWithoutExploitableCourse_ },
    { name: "ANALYTICS / agrégation multi-cours", test: AKS_testAnalyticsOrchestrator_buildsWeightedGlobalAggregate_ },
    { name: "ANALYTICS / diagnostics orchestrés", test: AKS_testAnalyticsOrchestrator_propagatesDiagnostics_ },
    { name: "ANALYTICS / orchestration GOLD-006", test: AKS_testAnalyticsOrchestrator_matchesGold006_ },
    { name: "ANALYTICS / orchestration immuable", test: AKS_testAnalyticsOrchestrator_isDeterministicPureAndImmutable_ },

    { name: "ANALYTICS / restitution cours et global", test: AKS_testAnalyticsRestitution_buildsCourseAndGlobalBlocks_ },
    { name: "ANALYTICS / restitution métriques", test: AKS_testAnalyticsRestitution_exposesAuditableMetrics_ },
    { name: "ANALYTICS / restitution affichage", test: AKS_testAnalyticsRestitution_formatsOneDecimalWithoutChangingRawValue_ },
    { name: "ANALYTICS / restitution diagnostics", test: AKS_testAnalyticsRestitution_separatesTechnicalDiagnostics_ },
    { name: "ANALYTICS / restitution indisponible", test: AKS_testAnalyticsRestitution_preservesUnavailableCourses_ },
    { name: "ANALYTICS / restitution cours féminin", test: AKS_testAnalyticsRestitution_mentionsHistoricalWomensExclusion_ },
    { name: "ANALYTICS / restitution indicateurs désactivés", test: AKS_testAnalyticsRestitution_exposesDisabledIndicatorsWithoutScore_ },
    { name: "ANALYTICS / restitution qualité", test: AKS_testAnalyticsRestitution_aggregatesDataQuality_ },
    { name: "ANALYTICS / restitution GOLD-006", test: AKS_testAnalyticsRestitution_matchesGold006_ },
    { name: "ANALYTICS / restitution immuable", test: AKS_testAnalyticsRestitution_isDeterministicPureAndImmutable_ },

    { name: "ANALYTICS / contenus cours et global", test: AKS_testAnalyticsReportContent_buildsCourseAndGlobalReports_ },
    { name: "ANALYTICS / contenus harmonisés", test: AKS_testAnalyticsReportContent_usesHarmonizedStructure_ },
    { name: "ANALYTICS / contenus métriques", test: AKS_testAnalyticsReportContent_formatsMetricsWithoutRecalculation_ },
    { name: "ANALYTICS / contenus couverture", test: AKS_testAnalyticsReportContent_exposesCoverage_ },
    { name: "ANALYTICS / contenus partiels", test: AKS_testAnalyticsReportContent_preservesPartialState_ },
    { name: "ANALYTICS / contenus indisponibles", test: AKS_testAnalyticsReportContent_marksUnavailableCourse_ },
    { name: "ANALYTICS / contenus cours féminin", test: AKS_testAnalyticsReportContent_mentionsHistoricalWomensExclusion_ },
    { name: "ANALYTICS / contenus indicateurs désactivés", test: AKS_testAnalyticsReportContent_exposesDisabledIndicatorsWithoutScore_ },
    { name: "ANALYTICS / contenus GOLD-006", test: AKS_testAnalyticsReportContent_matchesGold006_ },
    { name: "ANALYTICS / contenus immuables", test: AKS_testAnalyticsReportContent_isDeterministicPureAndImmutable_ },

    { name: "ANALYTICS / graphiques cours et global", test: AKS_testAnalyticsChartModel_buildsCourseAndGlobalCharts_ },
    { name: "ANALYTICS / graphiques axe fixe", test: AKS_testAnalyticsChartModel_usesFixedPercentageAxis_ },
    { name: "ANALYTICS / graphiques valeurs", test: AKS_testAnalyticsChartModel_preservesValuesWithoutRecalculation_ },
    { name: "ANALYTICS / graphiques couverture", test: AKS_testAnalyticsChartModel_exposesCoverageSeparately_ },
    { name: "ANALYTICS / graphiques indisponible", test: AKS_testAnalyticsChartModel_marksUnavailableWithoutZero_ },
    { name: "ANALYTICS / graphiques comparaison globale", test: AKS_testAnalyticsChartModel_buildsGlobalComparisonAndReferences_ },
    { name: "ANALYTICS / graphiques accessibles", test: AKS_testAnalyticsChartModel_usesAccessiblePrintConventions_ },
    { name: "ANALYTICS / graphiques indicateurs exclus", test: AKS_testAnalyticsChartModel_excludesDisabledIndicatorsAndScore_ },
    { name: "ANALYTICS / graphiques GOLD-006", test: AKS_testAnalyticsChartModel_matchesGold006_ },
    { name: "ANALYTICS / graphiques immuables", test: AKS_testAnalyticsChartModel_isDeterministicPureAndImmutable_ },

    { name: "ANALYTICS / mises en page cours et global", test: AKS_testAnalyticsReportLayout_buildsCourseAndGlobalCompositions_ },
    { name: "ANALYTICS / mises en page harmonisées", test: AKS_testAnalyticsReportLayout_usesHarmonizedCourseStructure_ },
    { name: "ANALYTICS / mises en page sections", test: AKS_testAnalyticsReportLayout_ordersRequiredSections_ },
    { name: "ANALYTICS / mises en page graphiques", test: AKS_testAnalyticsReportLayout_placesMatchingChartWithoutRecalculation_ },
    { name: "ANALYTICS / mises en page visibilité", test: AKS_testAnalyticsReportLayout_appliesConditionalVisibility_ },
    { name: "ANALYTICS / mises en page indisponible", test: AKS_testAnalyticsReportLayout_preservesUnavailableState_ },
    { name: "ANALYTICS / mises en page vue globale", test: AKS_testAnalyticsReportLayout_buildsGlobalOverview_ },
    { name: "ANALYTICS / mises en page accessibles", test: AKS_testAnalyticsReportLayout_definesA4AccessiblePrintContract_ },
    { name: "ANALYTICS / mises en page GOLD-006", test: AKS_testAnalyticsReportLayout_matchesGold006_ },
    { name: "ANALYTICS / mises en page immuables", test: AKS_testAnalyticsReportLayout_isDeterministicPureAndImmutable_ },

    { name: "ANALYTICS / modules avant modèle", test: AKS_testAnalyticsLoadOrder_modulesInitializeBeforeModel_ },
    { name: "ANALYTICS / résolution tardive consolidation", test: AKS_testAnalyticsLoadOrder_consolidatorResolvesModelAtCallTime_ },
    { name: "ANALYTICS / résolution tardive normalisation", test: AKS_testAnalyticsLoadOrder_normalizerResolvesModelAtCallTime_ },
    { name: "ANALYTICS / résolution tardive indicateurs", test: AKS_testAnalyticsLoadOrder_indicatorEngineResolvesModelAtCallTime_ },
    { name: "ANALYTICS / résolution tardive orchestration", test: AKS_testAnalyticsLoadOrder_orchestratorResolvesModelAtCallTime_ },

    { name: "ANALYTICS / rapports HTML autonomes", test: AKS_testAnalyticsHtmlReport_buildsAutonomousDocuments_ },
    { name: "ANALYTICS / rapports HTML A4", test: AKS_testAnalyticsHtmlReport_definesA4PrintOutput_ },
    { name: "ANALYTICS / rapports HTML SVG", test: AKS_testAnalyticsHtmlReport_rendersIntegratedSvg_ },
    { name: "ANALYTICS / rapports HTML sans recalcul", test: AKS_testAnalyticsHtmlReport_preservesValuesWithoutRecalculation_ },
    { name: "ANALYTICS / rapports HTML indisponible", test: AKS_testAnalyticsHtmlReport_marksUnavailableWithoutZero_ },
    { name: "ANALYTICS / rapports HTML échappement", test: AKS_testAnalyticsHtmlReport_escapesUntrustedContent_ },
    { name: "ANALYTICS / rapports HTML global", test: AKS_testAnalyticsHtmlReport_rendersGlobalVariant_ },
    { name: "ANALYTICS / rapports HTML empreinte", test: AKS_testAnalyticsHtmlReport_exposesVersionsAndFingerprint_ },
    { name: "ANALYTICS / rapports HTML GOLD-006", test: AKS_testAnalyticsHtmlReport_matchesGold006_ },
    { name: "ANALYTICS / rapports HTML immuables", test: AKS_testAnalyticsHtmlReport_isDeterministicPureAndImmutable_ },

    { name: "ANALYTICS / lot PDF complet", test: AKS_testAnalyticsPdf_convertsCompleteFiveDocumentBatch_ },
    { name: "ANALYTICS / rapports PDF métadonnées", test: AKS_testAnalyticsPdf_preservesMetadataAndHtmlFingerprint_ },
    { name: "ANALYTICS / rapports PDF noms", test: AKS_testAnalyticsPdf_normalizesPdfNames_ },
    { name: "ANALYTICS / rapports PDF taille blob", test: AKS_testAnalyticsPdf_exposesValidatedBlobSize_ },
    { name: "ANALYTICS / rapports PDF limite", test: AKS_testAnalyticsPdf_rejectsBatchBeforeQuotaConsumption_ },
    { name: "ANALYTICS / rapports PDF politique quota", test: AKS_testAnalyticsPdf_rejectsInvalidQuotaPolicy_ },
    { name: "ANALYTICS / rapports PDF quota Google", test: AKS_testAnalyticsPdf_mapsGoogleQuotaFailure_ },
    { name: "ANALYTICS / rapports PDF MIME", test: AKS_testAnalyticsPdf_rejectsInvalidMimeType_ },
    { name: "ANALYTICS / rapports PDF signature", test: AKS_testAnalyticsPdf_rejectsInvalidSignature_ },
    { name: "ANALYTICS / rapports PDF GOLD-006", test: AKS_testAnalyticsPdf_matchesGold006_ },
    { name: "ANALYTICS / Drive racine par ID", test: AKS_testAnalyticsDrive_requiresConfiguredRootId_ },
    { name: "ANALYTICS / Drive saison valide", test: AKS_testAnalyticsDrive_rejectsInvalidSeasonBeforeWrite_ },
    { name: "ANALYTICS / Drive lot complet", test: AKS_testAnalyticsDrive_rejectsIncompleteBatchBeforeWrite_ },
    { name: "ANALYTICS / Drive arborescence", test: AKS_testAnalyticsDrive_createsControlledSeasonTree_ },
    { name: "ANALYTICS / Drive traçabilité", test: AKS_testAnalyticsDrive_exposesIdsUrlsAndSourceTrace_ },
    { name: "ANALYTICS / Drive archivage", test: AKS_testAnalyticsDrive_archivesPreviousPublication_ },
    { name: "ANALYTICS / Drive échec partiel", test: AKS_testAnalyticsDrive_trashesPreparationOnPartialFailure_ },
    { name: "ANALYTICS / Drive restauration", test: AKS_testAnalyticsDrive_restoresCurrentWhenPromotionFails_ },
    { name: "ANALYTICS / Drive collision", test: AKS_testAnalyticsDrive_detectsControlledFolderCollision_ },
    { name: "ANALYTICS / Drive journalisation", test: AKS_testAnalyticsDrive_logsOnlyPublicationMetadata_ }
    ,{ name: "ANALYTICS / Sheets modèle officiel", test: AKS_testAnalyticsSheets_loadsOfficialModel_ }
    ,{ name: "ANALYTICS / Sheets en-têtes après préambule", test: AKS_testAnalyticsSheets_detectsHeadersAfterPreamble_ }
    ,{ name: "ANALYTICS / Sheets saison", test: AKS_testAnalyticsSheets_rejectsInvalidSeason_ }
    ,{ name: "ANALYTICS / Sheets IDs attendus", test: AKS_testAnalyticsSheets_requiresExpectedIds_ }
    ,{ name: "ANALYTICS / Sheets périmètre historique", test: AKS_testAnalyticsSheets_keepsFourHistoricalCourses_ }
    ,{ name: "ANALYTICS / Sheets source conforme vide", test: AKS_testAnalyticsSheets_distinguishesConformingEmptySource_ }
    ,{ name: "ANALYTICS / Sheets feuille obligatoire", test: AKS_testAnalyticsSheets_detectsMissingSheet_ }
    ,{ name: "ANALYTICS / Sheets colonnes", test: AKS_testAnalyticsSheets_detectsMissingColumn_ }
    ,{ name: "ANALYTICS / Sheets identité modèle", test: AKS_testAnalyticsSheets_validatesModelIdentity_ }
    ,{ name: "ANALYTICS / Sheets vide non renseigné", test: AKS_testAnalyticsSheets_preservesBlankAsUnknown_ }
    ,{ name: "ANALYTICS / Sheets séance annulée", test: AKS_testAnalyticsSheets_excludesCancelledSession_ }
    ,{ name: "ANALYTICS / Sheets brouillon exclu", test: AKS_testAnalyticsSheets_excludesDraftSession_ }
    ,{ name: "ANALYTICS / Sheets fuseau classeur", test: AKS_testAnalyticsSheets_respectsSpreadsheetTimeZone_ }
    ,{ name: "ANALYTICS / Sheets clôture lue", test: AKS_testAnalyticsSheets_readsClosedSession_ }
    ,{ name: "ANALYTICS / Sheets isolation cours", test: AKS_testAnalyticsSheets_isolatesCourseFailure_ }
    ,{ name: "ANALYTICS / Sheets orchestration", test: AKS_testAnalyticsSheets_feedsOrchestrator_ }
    ,{ name: "ANALYTICS-SAISIE-002 / création brouillon", test: AKS_testAttendanceWrite_createsDraftBatch_ }
    ,{ name: "ACCESS-001 / refus avant lecture Sheets", test: AKS_testAttendanceWrite_deniesBeforeRepositoryRead_ }
    ,{ name: "ACCESS-001 / composition saisie", test: AKS_testAttendanceWrite_composesCentralAccessByDefault_ }
    ,{ name: "ANALYTICS-SAISIE-002 / rejeu identique", test: AKS_testAttendanceWrite_replaysIdenticalSubmission_ }
    ,{ name: "ANALYTICS-SAISIE-002 / rejeu divergent", test: AKS_testAttendanceWrite_rejectsDivergentReplay_ }
    ,{ name: "ANALYTICS-SAISIE-002 / brouillon incomplet", test: AKS_testAttendanceWrite_acceptsIncompleteDraft_ }
    ,{ name: "ANALYTICS-SAISIE-002 / clôture incomplète", test: AKS_testAttendanceWrite_rejectsIncompleteClosure_ }
    ,{ name: "ANALYTICS-SAISIE-002 / clôture complète", test: AKS_testAttendanceWrite_closesCompleteSession_ }
    ,{ name: "ANALYTICS-SAISIE-002 / licencié inconnu", test: AKS_testAttendanceWrite_rejectsUnknownMember_ }
    ,{ name: "ANALYTICS-SAISIE-002 / licencié dupliqué", test: AKS_testAttendanceWrite_rejectsDuplicateMember_ }
    ,{ name: "ANALYTICS-SAISIE-002 / statut inconnu", test: AKS_testAttendanceWrite_rejectsUnknownStatus_ }
    ,{ name: "ANALYTICS-SAISIE-002 / version périmée", test: AKS_testAttendanceWrite_rejectsStaleVersion_ }
    ,{ name: "ANALYTICS-SAISIE-002 / motif obligatoire", test: AKS_testAttendanceWrite_requiresCorrectionReason_ }
    ,{ name: "ANALYTICS-SAISIE-002 / correction auditée", test: AKS_testAttendanceWrite_correctsClosedWithAudit_ }
    ,{ name: "ANALYTICS-SAISIE-002 / verrou indisponible", test: AKS_testAttendanceWrite_rejectsUnavailableLock_ }
    ,{ name: "ANALYTICS-SAISIE-002 / restauration", test: AKS_testAttendanceWrite_rollsBackFailedVerification_ }
    ,{ name: "ANALYTICS-SAISIE-002 / échec restauration", test: AKS_testAttendanceWrite_reportsRollbackFailure_ }
    ,{ name: "ANALYTICS / aperçu sans écriture", test: AKS_testAnalyticsOperational_previewIsReadOnly_ }
    ,{ name: "ANALYTICS / sources incomplètes bloquées", test: AKS_testAnalyticsOperational_blocksIncompleteSources_ }
    ,{ name: "ANALYTICS / données de validation bloquées", test: AKS_testAnalyticsOperational_blocksValidationRows_ }
    ,{ name: "ANALYTICS / confirmation explicite", test: AKS_testAnalyticsOperational_requiresExplicitConfirmation_ }
    ,{ name: "ANALYTICS / aperçu périmé", test: AKS_testAnalyticsOperational_rejectsStalePreview_ }
    ,{ name: "ANALYTICS / publication confirmée", test: AKS_testAnalyticsOperational_publishesConfirmedCurrentPreview_ }
    ,{ name: "ANALYTICS / verrou libéré", test: AKS_testAnalyticsOperational_releasesLockAfterFailure_ }
    ,{ name: "ANALYTICS / publication concurrente", test: AKS_testAnalyticsOperational_rejectsConcurrentPublication_ }
    ,{ name: "ANALYTICS / chaîne réelle composée", test: AKS_testAnalyticsOperational_composesRealAnalyticsChain_ }
    ,{ name: "ANALYTICS / actions administratives protégées", test: AKS_testAnalyticsAdmin_protectsEveryServerAction_ }
    ,{ name: "ANALYTICS / saison et navigation", test: AKS_testAnalyticsAdmin_buildsNavigationAndSeason_ }
    ,{ name: "ANALYTICS / diagnostics sans données individuelles", test: AKS_testAnalyticsAdmin_diagnosticContainsNoIndividualData_ }
    ,{ name: "ANALYTICS / aperçu sans publication", test: AKS_testAnalyticsAdmin_previewDelegatesWithoutPublishing_ }
    ,{ name: "ANALYTICS / confirmation UI obligatoire", test: AKS_testAnalyticsAdmin_requiresExplicitConfirmation_ }
    ,{ name: "ANALYTICS / jeton et racine configurée", test: AKS_testAnalyticsAdmin_forwardsPreviewTokenAndConfiguredRoot_ }
    ,{ name: "ANALYTICS / saison invalide bloquée", test: AKS_testAnalyticsAdmin_rejectsInvalidSeasonBeforeService_ }
    ,{ name: "ANALYTICS / client anti-doublon et aperçu périmé", test: AKS_testAnalyticsAdmin_clientPreventsDuplicateAndStaleActions_ }
    ,{ name: "ANALYTICS / vue accessible et confirmation", test: AKS_testAnalyticsAdmin_viewHasAccessibleFeedbackAndConfirmation_ }
    ,{ name: "ANALYTICS / charte visuelle administrative partagée", test: AKS_testAnalyticsAdmin_viewReusesAdministrativeVisualCharter_ }
    ,{ name: "ANALYTICS / destination de navigation", test: AKS_testAnalyticsAdmin_navigationPublishesDestination_ }
    ,{ name: "ACCESS-001 / identité absente", test: AKS_testAccess001_rejectsMissingIdentity_ }
    ,{ name: "ACCESS-001 / identité normalisée", test: AKS_testAccess001_normalizesIdentity_ }
    ,{ name: "ACCESS-001 / compte inconnu", test: AKS_testAccess001_rejectsUnknownAccount_ }
    ,{ name: "ACCESS-001 / compte dupliqué", test: AKS_testAccess001_rejectsDuplicateAccount_ }
    ,{ name: "ACCESS-001 / professeur limité", test: AKS_testAccess001_limitsTeacherToAssignment_ }
    ,{ name: "ACCESS-001 / assistant limité", test: AKS_testAccess001_limitsAssistant_ }
    ,{ name: "ACCESS-001 / consultation seule", test: AKS_testAccess001_keepsConsultationReadOnly_ }
    ,{ name: "ACCESS-001 / rôle administrateur descriptif", test: AKS_testAccess001_keepsAdministratorRoleDescriptive_ }
    ,{ name: "ACCESS-001 / périmètre invalide", test: AKS_testAccess001_rejectsInvalidScope_ }
    ,{ name: "ACCESS-001 / rôle inconnu", test: AKS_testAccess001_rejectsUnknownRole_ }
    ,{ name: "ACCESS-001 / schéma inconnu", test: AKS_testAccess001_rejectsUnknownSchema_ }
    ,{ name: "ACCESS-001 / amorçage historique", test: AKS_testAccess001_preservesLegacyBootstrap_ }
    ,{ name: "ACCESS-001 / amorçage refusé", test: AKS_testAccess001_doesNotBootstrapUnknownUser_ }
    ,{ name: "ACCESS-001 / cours autorisés", test: AKS_testAccess001_listsOnlyAuthorizedCourses_ }
    ,{ name: "ACCESS-001 / dernier administrateur", test: AKS_testAccess001_rejectsLastAdministratorRemoval_ }
    ,{ name: "ACCESS-001 / registre audité", test: AKS_testAccess001_savesAndAuditsRegistry_ }
    ,{ name: "ACCESS-001 / écriture registre refusée", test: AKS_testAccess001_rejectsUnauthorizedRegistryWrite_ }
    ,{ name: "ACCESS-001 / affectation expirée", test: AKS_testAccess001_rejectsExpiredAssignment_ }
    ,{ name: "ACCESS-002-01 / lecture globale protégée", test: AKS_testAccess002Admin_readsRegistryWithAccessManage_ }
    ,{ name: "ACCESS-002-01 / lecture globale refusée", test: AKS_testAccess002Admin_rejectsGlobalReadWithoutAccessManage_ }
    ,{ name: "ACCESS-002-01 / bootstrap historique en lecture seule", test: AKS_testAccess002Admin_preservesLegacyBootstrapReadOnly_ }
    ,{ name: "ACCESS-002-01 / vue défensive immuable", test: AKS_testAccess002Admin_returnsImmutableDefensiveView_ }
    ,{ name: "ACCESS-002-01 / écriture atomique et métadonnées serveur", test: AKS_testAccess002Admin_writesAtomicallyWithServerMetadata_ }
    ,{ name: "ACCESS-002-01 / audit persistant avant après corrélé", test: AKS_testAccess002Admin_persistsCorrelatedBeforeAfterAudit_ }
    ,{ name: "ACCESS-002-01 / audit persistant obligatoire avant mutation", test: AKS_testAccess002Admin_refusesMutationWithoutPersistentAudit_ }
    ,{ name: "ACCESS-002-01 / restauration après échec de preuve finale", test: AKS_testAccess002Admin_restoresRegistryWhenFinalAuditFails_ }
    ,{ name: "ACCESS-002-01 / refus audité sans écriture", test: AKS_testAccess002Admin_auditsRefusalWithoutWrite_ }
    ,{ name: "ACCESS-002-03 / refus métier audité sans écriture", test: AKS_testAccess002Admin_recordsLifecycleRefusalWithoutRegistryWrite_ }
    ,{ name: "ACCESS-002-01 / écriture refusée avant verrou", test: AKS_testAccess002Admin_rejectsWriteBeforeLockWithoutAccessManage_ }
    ,{ name: "ACCESS-002-01 / validation stricte avant verrou", test: AKS_testAccess002Admin_rejectsInvalidIdentityDatesAndScope_ }
    ,{ name: "ACCESS-002-01 / conflit de révision", test: AKS_testAccess002Admin_rejectsConcurrentRevision_ }
    ,{ name: "ACCESS-002-01 / restauration après échec de vérification", test: AKS_testAccess002Admin_restoresPreviousRegistryAfterVerificationFailure_ }
    ,{ name: "ACCESS-002-01 / verrou indisponible", test: AKS_testAccess002Admin_rejectsUnavailableLockWithoutWrite_ }
    ,{ name: "ACCESS-002-01 / dernier gestionnaire effectif", test: AKS_testAccess002Admin_preservesLastEffectiveManager_ }
    ,{ name: "ACCESS-002-01 / réactivation sans anciennes habilitations", test: AKS_testAccess002Admin_reactivationClearsFormerAssignments_ }
    ,{ name: "ACCESS-002-01 / périmètre historique inactif conservé", test: AKS_testAccess002Admin_preservesInactiveHistoricalScope_ }
    ,{ name: "ACCESS-002-02 / précontrôle recette sans écriture", test: AKS_testAccess002Recipe_preflightIsReadOnlyAndMinimized_ }
    ,{ name: "ACCESS-002-02 / audit persistant requis au précontrôle", test: AKS_testAccess002Recipe_rejectsUnavailablePersistentAudit_ }
    ,{ name: "ACCESS-002-02 / échec de validation audit converti", test: AKS_testAccess002Recipe_mapsAuditValidationFailureWithoutWrite_ }
    ,{ name: "ACCESS-002-02 / garde de couverture audit réelle", test: AKS_testSuiteV11_includesRealAuditPreflightCoverage_ }
    ,{ name: "ACCESS-002-02 / cible recette confirmée", test: AKS_testAccess002Recipe_rejectsUnconfirmedTarget_ }
    ,{ name: "ACCESS-002-02 / identité refus privilégiée rejetée", test: AKS_testAccess002Recipe_rejectsInvalidOrPrivilegedDeniedIdentity_ }
    ,{ name: "ACCESS-002-02 / sauvegarde avant mutation", test: AKS_testAccess002Recipe_verifiesBackupBeforeRegistryMutation_ }
    ,{ name: "ACCESS-002-02 / administrateur et ACCESS_MANAGE explicite uniquement", test: AKS_testAccess002Recipe_bootstrapsAdministratorWithExplicitManageOnly_ }
    ,{ name: "ACCESS-002-02 / administrateur sans capacité implicite", test: AKS_testAccess002Recipe_grantsNoImplicitAdministratorCapability_ }
    ,{ name: "ACCESS-002-02 / application idempotente", test: AKS_testAccess002Recipe_applyIsIdempotentWhileBackupMatches_ }
    ,{ name: "ACCESS-002-02 / concurrence sérialisée", test: AKS_testAccess002Recipe_concurrentApplyCannotUndoSuccessfulApply_ }
    ,{ name: "ACCESS-002-02 / registre absent restauré", test: AKS_testAccess002Recipe_restoresExactMissingRegistryAndRemovesBackup_ }
    ,{ name: "ACCESS-002-02 / sérialisation restaurée", test: AKS_testAccess002Recipe_restoresExactExistingSerialization_ }
    ,{ name: "ACCESS-002-02 / conflit de restauration", test: AKS_testAccess002Recipe_refusesRestoreAfterConcurrentChange_ }
    ,{ name: "ACCESS-002-02 / auto-restauration après échec", test: AKS_testAccess002Recipe_autoRestoresWhenDecisionVerificationFails_ }
    ,{ name: "ACCESS-002-02 / audit final de restauration", test: AKS_testAccess002Recipe_rollsBackFailedFinalRestoreAudit_ }
    ,{ name: "ANALYTICS-SAISIE-003 / refus avant lecture", test: AKS_testAnalyticsSaisie003_deniesBeforeWorkspaceRead_ }
    ,{ name: "ANALYTICS-SAISIE-003 / périmètre invalide", test: AKS_testAnalyticsSaisie003_rejectsInvalidWorkspaceScope_ }
    ,{ name: "ANALYTICS-SAISIE-003 / espace nettoyé", test: AKS_testAnalyticsSaisie003_returnsSafeWorkspace_ }
    ,{ name: "ANALYTICS-SAISIE-003 / parcours mobile", test: AKS_testAnalyticsSaisie003_exposesMobilePage_ }
    ,{ name: "ANALYTICS-SAISIE-003 / retour accessible", test: AKS_testAnalyticsSaisie003_hasAccessibleFeedback_ }
    ,{ name: "ANALYTICS-SAISIE-003 / cibles mobiles", test: AKS_testAnalyticsSaisie003_hasMobileTargets_ }
    ,{ name: "ANALYTICS-SAISIE-004 / roster nettoyé", test: AKS_testAnalyticsSaisie004_returnsSafeEligibleRoster_ }
    ,{ name: "ANALYTICS-SAISIE-004 / reprise brouillon", test: AKS_testAnalyticsSaisie004_returnsResumableDraft_ }
    ,{ name: "ANALYTICS-SAISIE-004 / statuts rapides", test: AKS_testAnalyticsSaisie004_exposesRapidStatusControls_ }
    ,{ name: "ANALYTICS-SAISIE-004 / sauvegarde versionnée", test: AKS_testAnalyticsSaisie004_savesVersionedDraftThroughServer_ }
    ,{ name: "ANALYTICS-SAISIE-005 / confirmation clôture", test: AKS_testAnalyticsSaisie005_exposesExplicitClosureConfirmation_ }
    ,{ name: "ANALYTICS-SAISIE-005 / clôture incomplète bloquée", test: AKS_testAnalyticsSaisie005_rejectsIncompleteClosureClientSide_ }
    ,{ name: "ANALYTICS-SAISIE-005 / commande clôture versionnée", test: AKS_testAnalyticsSaisie005_closesThroughVersionedServerCommand_ }
    ,{ name: "ANALYTICS-SAISIE-005 / retour lecture seule", test: AKS_testAnalyticsSaisie005_returnsClosedSessionToReadOnly_ }
    ,{ name: "ANALYTICS-SAISIE-006 / identité et cible recette", test: AKS_testAnalyticsSaisie006_locksRecipeIdentityAndTarget_ }
    ,{ name: "ANALYTICS-SAISIE-006 / périmètre et date recette", test: AKS_testAnalyticsSaisie006_locksRecipeScopeAndDate_ }
    ,{ name: "ANALYTICS-SAISIE-006 / route recette distincte", test: AKS_testAnalyticsSaisie006_exposesDistinctRecipeRoute_ }
    ,{ name: "ANALYTICS-SAISIE-006 / endpoints client distincts", test: AKS_testAnalyticsSaisie006_usesDedicatedClientEndpoints_ }
    ,{ name: "ACCESS-001 / API contexte minimal", test: AKS_testAttendanceServer_exposesSafeAccessContext_ }
    ,{ name: "ACCESS-001 / API refus nettoyé", test: AKS_testAttendanceServer_refusesBeforeWrite_ }
    ,{ name: "ACCESS-001 / API dépendances ignorées", test: AKS_testAttendanceServer_ignoresClientDependencies_ }
    ,{ name: "ACCESS-001 / API erreur masquée", test: AKS_testAttendanceServer_hidesUnexpectedFailure_ }
    ,{ name: "ACCESS-002-01 / capacités Analytics indépendantes", test: AKS_testAccess002Catalogue_exposesIndependentAnalyticsCapabilities_ }
    ,{ name: "ACCESS-002-01 / compatibilité access/1.0", test: AKS_testAccess002Catalogue_preservesAccess10Compatibility_ }
    ,{ name: "ACCESS-002-02 / affectation transverse autorisée", test: AKS_testAccess002ExplicitManage_authorizesTransverseAssignment_ }
    ,{ name: "ACCESS-002-02 / rôle seul refusé", test: AKS_testAccess002ExplicitManage_rejectsRoleWithoutAssignment_ }
    ,{ name: "ACCESS-002-02 / affectation inactive ou hors période refusée", test: AKS_testAccess002ExplicitManage_rejectsInactiveOrOutOfPeriodAssignment_ }
    ,{ name: "ACCESS-002-02 / forme transverse invalide refusée", test: AKS_testAccess002ExplicitManage_rejectsInvalidTransverseShape_ }
    ,{ name: "ACCESS-002-02 / rôle d'affectation non détenu refusé", test: AKS_testAccess002ExplicitManage_rejectsRoleNotHeldByAccount_ }
    ,{ name: "ACCESS-002-02 / dernier gestionnaire explicite préservé", test: AKS_testAccess002ExplicitManage_preservesLastExplicitManager_ }
    ,{ name: "ACCESS-002-02 / gestionnaire historique migré vers habilitation explicite", test: AKS_testAccess002ExplicitManage_migratesHistoricalManager_ }
    ,{ name: "ACCESS-002-03 / synthèse effective sûre", test: AKS_testAccess002Projection_buildsSafeEffectiveSummary_ }
    ,{ name: "ACCESS-002-03 / gestionnaire explicite effectif", test: AKS_testAccess002Projection_marksManagerOnlyFromEffectiveAssignment_ }
    ,{ name: "ACCESS-002-03 / recherche et filtres combinés", test: AKS_testAccess002Projection_normalizesSearchAndCombinedFilters_ }
    ,{ name: "ACCESS-002-03 / états futur et sans habilitation", test: AKS_testAccess002Projection_filtersFutureAndWithoutAssignment_ }
    ,{ name: "ACCESS-002-03 / affectation future non effective", test: AKS_testAccess002Projection_marksFutureWhenNoAssignmentIsEffective_ }
    ,{ name: "ACCESS-002-03 / modules issus des capacités effectives", test: AKS_testAccess002Projection_derivesModulesFromEffectiveCapabilities_ }
    ,{ name: "ACCESS-002-03 / tri stable", test: AKS_testAccess002Projection_sortsActiveThenNameThenEmail_ }
    ,{ name: "ACCESS-002-03 / filtres inconnus refusés", test: AKS_testAccess002Projection_rejectsUnknownFiltersBeforeRead_ }
    ,{ name: "ACCESS-002-03 / refus administratif propagé", test: AKS_testAccess002Projection_propagatesAdministrativeRefusal_ }
    ,{ name: "ACCESS-002-03 / projection profondément immuable", test: AKS_testAccess002Projection_returnsDeeplyImmutableDefensiveView_ }
    ,{ name: "ACCESS-002-03 / lecture seule", test: AKS_testAccess002Projection_isReadOnly_ }
    ,{ name: "ACCESS-002-03 / création inactive sans habilitation", test: AKS_testAccess002Lifecycle_createsInactiveAccountWithoutAssignments_ }
    ,{ name: "ACCESS-002-03 / création invalide refusée", test: AKS_testAccess002Lifecycle_rejectsInvalidCreateBeforeRead_ }
    ,{ name: "ACCESS-002-03 / doublon refusé", test: AKS_testAccess002Lifecycle_rejectsDuplicateAccount_ }
    ,{ name: "ACCESS-002-03 / désactivation avec historique", test: AKS_testAccess002Lifecycle_deactivatesAndPreservesHistory_ }
    ,{ name: "ACCESS-002-03 / compte inconnu refusé", test: AKS_testAccess002Lifecycle_rejectsUnknownAccountWithoutWrite_ }
    ,{ name: "ACCESS-002-03 / désactivation idempotente", test: AKS_testAccess002Lifecycle_returnsInactiveAccountWithoutWrite_ }
    ,{ name: "ACCESS-002-03 / idempotence sous révision courante", test: AKS_testAccess002Lifecycle_rejectsStaleIdempotentCommand_ }
    ,{ name: "ACCESS-002-03 / effacement confirmé requis", test: AKS_testAccess002Lifecycle_requiresConfirmedAssignmentClear_ }
    ,{ name: "ACCESS-002-03 / réactivation sans anciennes habilitations", test: AKS_testAccess002Lifecycle_reactivatesWithoutOldAssignments_ }
    ,{ name: "ACCESS-002-03 / réactivation idempotente", test: AKS_testAccess002Lifecycle_returnsActiveAccountWithoutWrite_ }
    ,{ name: "ACCESS-002-03 / refus du socle audité propagé", test: AKS_testAccess002Lifecycle_propagatesAuditedBoundaryFailure_ }
    ,{ name: "ACCESS-002-03 / révision transmise au socle", test: AKS_testAccess002Lifecycle_passesExpectedRevisionToBoundary_ }
    ,{ name: "ACCESS-002-03 / résultat de cycle de vie immuable", test: AKS_testAccess002Lifecycle_returnsImmutableResult_ }
    ,{ name: "ACCESS-002-03 / route UI refusée avant projection", test: AKS_testAccess002AdminUi_deniesRouteBeforeProjection_ }
    ,{ name: "ACCESS-002-03 / modèle UI protégé", test: AKS_testAccess002AdminUi_buildsProtectedViewModel_ }
    ,{ name: "ACCESS-002-03 / commandes UI réautorisées", test: AKS_testAccess002AdminUi_reauthorizesEveryCommand_ }
    ,{ name: "ACCESS-002-03 / navigation UI conditionnelle", test: AKS_testAccess002AdminUi_hidesUnauthorizedNavigation_ }
    ,{ name: "ACCESS-002-03 / états UI sûrs", test: AKS_testAccess002AdminUi_exposesSafeInteractiveStates_ }
    ,{ name: "ACCESS-002-03 / recette précontrôle sans écriture", test: AKS_testAccess002AccountRecipe_preflightIsReadOnly_ }
    ,{ name: "ACCESS-002-03 / recette compte existant refusé", test: AKS_testAccess002AccountRecipe_rejectsExistingAccount_ }
    ,{ name: "ACCESS-002-03 / recette cycle vérifié", test: AKS_testAccess002AccountRecipe_runsVerifiedLifecycle_ }
    ,{ name: "ACCESS-002-03 / recette restauration exacte", test: AKS_testAccess002AccountRecipe_restoresExactInitialState_ }
    ,{ name: "ACCESS-002-03 / recette échec auto-restauré", test: AKS_testAccess002AccountRecipe_autoRestoresFailedCycle_ }
    ,{ name: "INSCRIPTIONS / corpus versionné", test: AKS_testInscriptionsGold_coversVersionedCorpus_ }
    ,{ name: "INSCRIPTIONS / immutabilité profonde", test: AKS_testInscriptionsGold_isDeeplyImmutable_ }
    ,{ name: "INSCRIPTIONS / empreintes vérifiées", test: AKS_testInscriptionsGold_verifiesFingerprints_ }
    ,{ name: "INSCRIPTIONS / catalogue réellement exécuté", test: AKS_testInscriptionsGold_executesValidatedCatalogue_ }
    ,{ name: "INSCRIPTIONS / identifiants canoniques uniques", test: AKS_testInscriptionsGold_allocatesUniqueCanonicalIdentifiers_ }
    ,{ name: "INSCRIPTIONS / conformité des oracles", test: AKS_testInscriptionsGold_matchesEveryExecutableOracle_ }
    ,{ name: "INSCRIPTIONS / Questionnaire santé minimisé", test: AKS_testInscriptionsGold_minimizesQuestionnaireSante_ }
    ,{ name: "INSCRIPTIONS / fabrique sans API Google", test: AKS_testInscriptionsGold_factoryContainsNoGoogleService_ }
    ,{ name: "INSCRIPTIONS-008 / catalogue exact", test: AKS_testInscriptions008_exposesExactCapabilityCatalogue_ }
    ,{ name: "INSCRIPTIONS-008 / compatibilité Présences", test: AKS_testInscriptions008_preservesAttendanceAssignments_ }
    ,{ name: "INSCRIPTIONS-008 / aucun octroi implicite", test: AKS_testInscriptions008_grantsNoImplicitRoleCapability_ }
    ,{ name: "INSCRIPTIONS-008 / capacités séparées", test: AKS_testInscriptions008_separatesExplicitCapabilities_ }
    ,{ name: "INSCRIPTIONS-008 / rôle d'affectation porté par le compte", test: AKS_testInscriptions008_requiresAssignmentRoleOnAccount_ }
    ,{ name: "INSCRIPTIONS-008 / six capacités et leurs portées", test: AKS_testInscriptions008_authorizesSixCapabilitiesWithTheirScopes_ }
    ,{ name: "INSCRIPTIONS-008 / matrice de portée fermée", test: AKS_testInscriptions008_validatesClosedScopeMatrix_ }
    ,{ name: "INSCRIPTIONS-008 / limites saison section cours", test: AKS_testInscriptions008_honorsSeasonSectionAndCourse_ }
    ,{ name: "INSCRIPTIONS-008 / périmètres expiré et ambigu", test: AKS_testInscriptions008_rejectsExpiredAndAmbiguousScopes_ }
    ,{ name: "INSCRIPTIONS-008 / refus avant lecture", test: AKS_testInscriptions008_deniesBeforeRepositoryRead_ }
    ,{ name: "INSCRIPTIONS-008 / périmètre serveur", test: AKS_testInscriptions008_readsTrustedScopeOnly_ }
    ,{ name: "INSCRIPTIONS-008 / intention avant commit", test: AKS_testInscriptions008_requiresIntentionBeforeCommit_ }
    ,{ name: "INSCRIPTIONS-008 / cours obligatoire pour affectation", test: AKS_testInscriptions008_requiresCourseForAssignmentWrite_ }
    ,{ name: "INSCRIPTIONS-008 / cycle réussi ordonné", test: AKS_testInscriptions008_ordersSuccessfulCommand_ }
    ,{ name: "INSCRIPTIONS-008 / audit final obligatoire", test: AKS_testInscriptions008_doesNotConfirmWithoutFinalAudit_ }
    ,{ name: "INSCRIPTIONS-008 / échec de contrôle récupérable", test: AKS_testInscriptions008_recordsRecoverableControlFailure_ }
    ,{ name: "INSCRIPTIONS-008 / audit minimisé", test: AKS_testInscriptions008_minimizesAuditEvents_ }
    ,{ name: "INSCRIPTIONS-008 / aucune API Google", test: AKS_testInscriptions008_containsNoGoogleApi_ }
    ,{ name: "INSCRIPTIONS-008 / INS-GOLD-011 réussi", test: AKS_testInscriptions008_promotesGold011AfterProof_ }
    ,{ name: "INSCRIPTIONS-009 / enregistrement versionné minimisé", test: AKS_testInscriptions009_minimizesVersionedRecord_ }
    ,{ name: "INSCRIPTIONS-009 / cycle nominal unique", test: AKS_testInscriptions009_runsNominalCycleOnce_ }
    ,{ name: "INSCRIPTIONS-009 / rejeu confirmé sans commit", test: AKS_testInscriptions009_replaysConfirmedWithoutCommit_ }
    ,{ name: "INSCRIPTIONS-009 / réservation idempotente unique", test: AKS_testInscriptions009_reservesIdempotencyKeyOnce_ }
    ,{ name: "INSCRIPTIONS-009 / état de journal inconnu refusé", test: AKS_testInscriptions009_rejectsUnknownJournalState_ }
    ,{ name: "INSCRIPTIONS-009 / identité idempotente complète", test: AKS_testInscriptions009_rejectsEveryIdentityConflict_ }
    ,{ name: "INSCRIPTIONS-009 / refus avant lecture du journal", test: AKS_testInscriptions009_deniesBeforeJournalRead_ }
    ,{ name: "INSCRIPTIONS-009 / autorisation avant validation détaillée", test: AKS_testInscriptions009_authorizesBeforeDetailedValidation_ }
    ,{ name: "INSCRIPTIONS-009 / capacité imposée par l'action", test: AKS_testInscriptions009_imposesCapabilityFromAction_ }
    ,{ name: "INSCRIPTIONS-009 / reprise INTENTION reconstruite", test: AKS_testInscriptions009_resumesIntentionAfterReconstruction_ }
    ,{ name: "INSCRIPTIONS-009 / reprise EN_COURS avant commit", test: AKS_testInscriptions009_resumesRunningBeforeCommit_ }
    ,{ name: "INSCRIPTIONS-009 / droit retiré avant reprise", test: AKS_testInscriptions009_deniesRevokedRecoveryBeforeRepository_ }
    ,{ name: "INSCRIPTIONS-009 / réconciliation appliquée sans rejeu", test: AKS_testInscriptions009_reconcilesAppliedBeforeRetry_ }
    ,{ name: "INSCRIPTIONS-009 / reprise absente après reconstruction", test: AKS_testInscriptions009_retriesAbsentAfterReconstruction_ }
    ,{ name: "INSCRIPTIONS-009 / réconciliation ambiguë refusée", test: AKS_testInscriptions009_rejectsAmbiguousReconciliation_ }
    ,{ name: "INSCRIPTIONS-009 / échec final à trois tentatives", test: AKS_testInscriptions009_stopsAfterThirdMutationFailure_ }
    ,{ name: "INSCRIPTIONS-009 / contrôle et audit final obligatoires", test: AKS_testInscriptions009_doesNotConfirmFailedControlOrAudit_ }
    ,{ name: "INSCRIPTIONS-009 / corrélation de bout en bout", test: AKS_testInscriptions009_preservesCorrelationEverywhere_ }
    ,{ name: "INSCRIPTIONS-009 / conflit de version optimiste", test: AKS_testInscriptions009_rejectsOptimisticConflict_ }
    ,{ name: "INSCRIPTIONS-009 / aucune API Google", test: AKS_testInscriptions009_containsNoGoogleApi_ }
    ,{ name: "INSCRIPTIONS-010 / schéma exact", test: AKS_testInscriptions010_exposesExactSchema_ }
    ,{ name: "INSCRIPTIONS-010 / recette exacte", test: AKS_testInscriptions010_acceptsExactRecipe_ }
    ,{ name: "INSCRIPTIONS-010 / production refusée avant mutation", test: AKS_testInscriptions010_rejectsNonRecipeBeforeMutation_ }
    ,{ name: "INSCRIPTIONS-010 / ressource incohérente", test: AKS_testInscriptions010_rejectsResourceMismatch_ }
    ,{ name: "INSCRIPTIONS-010 / onglet inattendu", test: AKS_testInscriptions010_rejectsUnexpectedSheet_ }
    ,{ name: "INSCRIPTIONS-010 / en-têtes figés", test: AKS_testInscriptions010_rejectsHeaderDrift_ }
    ,{ name: "INSCRIPTIONS-010 / fuseau physique figé", test: AKS_testInscriptions010_rejectsSpreadsheetTimezoneDrift_ }
    ,{ name: "INSCRIPTIONS-010 / métadonnée inconnue", test: AKS_testInscriptions010_rejectsUnknownMetadata_ }
    ,{ name: "INSCRIPTIONS-010 / métadonnée dupliquée", test: AKS_testInscriptions010_rejectsDuplicateMetadata_ }
    ,{ name: "INSCRIPTIONS-010 / audit commun persistant", test: AKS_testInscriptions010_requiresPersistentCommonAudit_ }
    ,{ name: "INSCRIPTIONS-010 / journal projeté", test: AKS_testInscriptions010_loadsProjectedJournal_ }
    ,{ name: "INSCRIPTIONS-010 / réservation unique verrouillée", test: AKS_testInscriptions010_reservesOnceUnderLock_ }
    ,{ name: "INSCRIPTIONS-010 / réservation altérée détectée", test: AKS_testInscriptions010_rejectsAlteredJournalReservation_ }
    ,{ name: "INSCRIPTIONS-010 / doublon de journal", test: AKS_testInscriptions010_rejectsDuplicateJournalRows_ }
    ,{ name: "INSCRIPTIONS-010 / mise à jour versionnée", test: AKS_testInscriptions010_updatesExpectedJournalVersion_ }
    ,{ name: "INSCRIPTIONS-010 / mise à jour altérée détectée", test: AKS_testInscriptions010_rejectsAlteredJournalUpdate_ }
    ,{ name: "INSCRIPTIONS-010 / auteurs techniques distincts", test: AKS_testInscriptions010_preservesCreatedByOnUpdate_ }
    ,{ name: "INSCRIPTIONS-010 / version périmée", test: AKS_testInscriptions010_rejectsStaleJournalVersion_ }
    ,{ name: "INSCRIPTIONS-010 / identité de journal immuable", test: AKS_testInscriptions010_rejectsJournalIdentityChange_ }
    ,{ name: "INSCRIPTIONS-010 / état inconnu", test: AKS_testInscriptions010_rejectsInvalidJournalState_ }
    ,{ name: "INSCRIPTIONS-010 / séquence globale monotone", test: AKS_testInscriptions010_allocatesMonotoneGlobalSequence_ }
    ,{ name: "INSCRIPTIONS-010 / acteur de séquence injecté", test: AKS_testInscriptions010_usesInjectedSequenceActor_ }
    ,{ name: "INSCRIPTIONS-010 / écriture de séquence altérée", test: AKS_testInscriptions010_rejectsAlteredSequenceWrite_ }
    ,{ name: "INSCRIPTIONS-010 / séquence saisonnière", test: AKS_testInscriptions010_formatsSeasonSequence_ }
    ,{ name: "INSCRIPTIONS-010 / séquence import typée", test: AKS_testInscriptions010_formatsTypedImportSequence_ }
    ,{ name: "INSCRIPTIONS-010 / portée de séquence invalide", test: AKS_testInscriptions010_rejectsInvalidSequenceScope_ }
    ,{ name: "INSCRIPTIONS-010 / séquence dupliquée", test: AKS_testInscriptions010_rejectsDuplicateSequence_ }
    ,{ name: "INSCRIPTIONS-010 / verrou indisponible", test: AKS_testInscriptions010_rejectsLockTimeoutWithoutMutation_ }
    ,{ name: "INSCRIPTIONS-010 / échec avant verrou", test: AKS_testInscriptions010_releasesLockAfterWriteFailure_ }
    ,{ name: "INSCRIPTIONS-010 / noyau sans API Google", test: AKS_testInscriptions010_automaticCoreContainsNoGoogleApi_ }
    ,{ name: "INSCRIPTIONS-010 / recette hors suite automatique", test: AKS_testInscriptions010_recipeFunctionsStayOutOfAutomaticSuite_ }
    ,{ name: "INSCRIPTIONS-010 / configuration contrôlée", test: AKS_testInscriptions010_registersControlledConfiguration_ }
    ,{ name: "AUDIT-001 / catalogues figés", test: AKS_testAudit001_exposesFrozenCatalogs_ }
    ,{ name: "AUDIT-001 / configuration technique", test: AKS_testAudit001_registersTechnicalConfiguration_ }
    ,{ name: "AUDIT-001 / preuve complète relue", test: AKS_testAudit001_persistsAndRereadsCompleteProof_ }
    ,{ name: "AUDIT-001 / identités serveur", test: AKS_testAudit001_resolvesServerIdentities_ }
    ,{ name: "AUDIT-001 / horodatages serveur", test: AKS_testAudit001_usesServerTimestamps_ }
    ,{ name: "AUDIT-001 / JSON canonique", test: AKS_testAudit001_serializesMetadataDeterministically_ }
    ,{ name: "AUDIT-001 / preuve registre ACCESS minimisée", test: AKS_testAudit001_persistsMinimizedAccessRegistryProof_ }
    ,{ name: "AUDIT-001 / métadonnées ACCESS invalides refusées", test: AKS_testAudit001_rejectsInvalidAccessRegistryMetadata_ }
    ,{ name: "AUDIT-001 / cycle ACCESS persistant de bout en bout", test: AKS_testAudit001_persistsAccessServiceCycleEndToEnd_ }
    ,{ name: "AUDIT-001 / schéma fermé de métadonnées", test: AKS_testAudit001_rejectsMetadataOutsideClosedSchema_ }
    ,{ name: "AUDIT-001 / valeur JSON invalide refusée", test: AKS_testAudit001_rejectsInvalidMetadataValue_ }
    ,{ name: "AUDIT-001 / catalogue inconnu refusé", test: AKS_testAudit001_rejectsUnknownCatalogValue_ }
    ,{ name: "AUDIT-001 / motif inconnu réduit", test: AKS_testAudit001_reducesUnknownReason_ }
    ,{ name: "AUDIT-001 / production refusée avant verrou", test: AKS_testAudit001_rejectsNonRecipeBeforeLock_ }
    ,{ name: "AUDIT-001 / ressource inattendue refusée", test: AKS_testAudit001_rejectsResourceMismatch_ }
    ,{ name: "AUDIT-001 / marqueur recette ambigu refusé", test: AKS_testAudit001_rejectsAmbiguousRecipeNames_ }
    ,{ name: "AUDIT-001 / nom recette avec espaces refusé", test: AKS_testAudit001_rejectsPaddedExactRecipeName_ }
    ,{ name: "AUDIT-001 / environnement recette non exact refusé", test: AKS_testAudit001_rejectsNonExactRecipeEnvironment_ }
    ,{ name: "AUDIT-001 / version de schéma non exacte refusée", test: AKS_testAudit001_rejectsNonExactSchemaVersion_ }
    ,{ name: "AUDIT-001 / administrateur non habilité refusé", test: AKS_testAudit001_rejectsUnauthorizedAdminActor_ }
    ,{ name: "AUDIT-001 / utilisateur sans autorité refusé", test: AKS_testAudit001_rejectsUncontrolledUserOnDefaultPort_ }
    ,{ name: "AUDIT-001 / cible personnelle refusée", test: AKS_testAudit001_rejectsPersonalTargetIdentifier_ }
    ,{ name: "AUDIT-001 / corrélation personnelle refusée", test: AKS_testAudit001_rejectsPersonalCorrelationIdentifier_ }
    ,{ name: "AUDIT-001 / identifiant Google invalide refusé", test: AKS_testAudit001_rejectsInvalidGoogleSpreadsheetIdentifier_ }
    ,{ name: "AUDIT-001 / cycle corrélé complet", test: AKS_testAudit001_persistsCorrelatedCompleteCycle_ }
    ,{ name: "AUDIT-001 / en-tête incompatible refusé", test: AKS_testAudit001_rejectsHeaderMismatch_ }
    ,{ name: "AUDIT-001 / configuration absente refusée", test: AKS_testAudit001_rejectsMissingConfiguration_ }
    ,{ name: "AUDIT-001 / configuration non explicite refusée", test: AKS_testAudit001_rejectsNonExplicitConfiguration_ }
    ,{ name: "AUDIT-001 / standard sans dégradation", test: AKS_testAudit001_persistsStandardWithoutDegradation_ }
    ,{ name: "AUDIT-001 / verrou indisponible refusé", test: AKS_testAudit001_rejectsUnavailableLock_ }
    ,{ name: "AUDIT-001 / verrou libéré après panne", test: AKS_testAudit001_releasesLockAfterPersistenceFailure_ }
    ,{ name: "AUDIT-001 / identifiant dupliqué refusé", test: AKS_testAudit001_rejectsDuplicateIdentifier_ }
    ,{ name: "AUDIT-001 / preuve altérée refusée", test: AKS_testAudit001_rejectsAlteredPersistedProof_ }
    ,{ name: "AUDIT-001 / preuve immuable", test: AKS_testAudit001_returnsDeeplyImmutableProof_ }
    ,{ name: "AUDIT-001 / support persistant validé sans écriture", test: AKS_testAudit001_validatesPersistentRecipeSupportWithoutWrite_ }
    ,{ name: "AUDIT-001 / support persistant invalide refusé sans écriture", test: AKS_testAudit001_rejectsInvalidPersistentRecipeSupportWithoutWrite_ }
    ,{ name: "AUDIT-001 / port commun persistant", test: AKS_testAudit001_exposesPersistentCommonPort_ }
    ,{ name: "AUDIT-001 / adaptateur Sheets exact", test: AKS_testAudit001_sheetsGatewayAppendsAndReadsExactTexts_ }
    ,{ name: "AUDIT-001 / onglet Sheets obligatoire", test: AKS_testAudit001_sheetsGatewayRejectsMissingSheet_ }
    ,{ name: "AUDIT-001 / service sans API Google", test: AKS_testAudit001_domainServiceContainsNoGoogleApi_ }
    ,{ name: "AUDIT-001 / aucun audit propre à Inscriptions", test: AKS_testAudit001_requiresNoInscriptionsAuditService_ }
    ,{ name: "AUDIT-001 / recette cible isolée exacte", test: AKS_testAudit001Recipe_preparesOnlyExactIsolatedTarget_ }
    ,{ name: "AUDIT-001 / recette administrateur requis", test: AKS_testAudit001Recipe_rejectsUnauthorizedActorBeforeMutation_ }
    ,{ name: "AUDIT-001 / recette preuves corrélées et configuration restaurée", test: AKS_testAudit001Recipe_persistsCorrelatedProofsAndRestoresConfig_ }
    ,{ name: "AUDIT-001 / recette connexion persistante sans preuve", test: AKS_testAudit001Recipe_connectsPersistentSupportWithoutAuditWrite_ }
    ,{ name: "AUDIT-001 / recette connexion persistante idempotente", test: AKS_testAudit001Recipe_connectionIsIdempotent_ }
    ,{ name: "AUDIT-001 / recette déconnexion restaure exactement", test: AKS_testAudit001Recipe_disconnectRestoresExactConfiguration_ }
    ,{ name: "AUDIT-001 / recette déconnexion interdite avant restauration ACCESS", test: AKS_testAudit001Recipe_refusesDisconnectBeforeAccessRestore_ }
    ,{ name: "AUDIT-001 / recette récupération après restauration partielle", test: AKS_testAudit001Recipe_recoversPartialConnectionRestore_ }
    ,{ name: "AUDIT-001 / recette restauration après panne", test: AKS_testAudit001Recipe_restoresConfigAfterPersistenceFailure_ }
    ,{ name: "AUDIT-001 / recette restauration après installation partielle", test: AKS_testAudit001Recipe_restoresConfigAfterPartialInstallationFailure_ }
    ,{ name: "AUDIT-001 / recette conflit de configuration refusé", test: AKS_testAudit001Recipe_refusesToOverwriteConcurrentConfig_ }
    ,{ name: "AUDIT-001 / recette restauration partielle après conflit", test: AKS_testAudit001Recipe_restoresNonConflictingConfigOnConflict_ }
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
