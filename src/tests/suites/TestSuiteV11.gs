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
    ,{ name: "ANALYTICS / Sheets isolation cours", test: AKS_testAnalyticsSheets_isolatesCourseFailure_ }
    ,{ name: "ANALYTICS / Sheets orchestration", test: AKS_testAnalyticsSheets_feedsOrchestrator_ }
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
