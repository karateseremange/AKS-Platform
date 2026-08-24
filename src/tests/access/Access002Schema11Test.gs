function AKS_access002Schema11Registry_(schemaVersion, analyticsAssignment) {
  return {
    schemaVersion: schemaVersion,
    accounts: [{
      email: "manager@example.com", displayName: "Gestionnaire", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", section: "", courseCode: "",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
      }].concat(analyticsAssignment ? [analyticsAssignment] : [])
    }]
  };
}

function AKS_access002Schema11AnalyticsAssignment_(overrides) {
  var assignment = {
    module: "ANALYTICS", season: "*", section: "", courseCode: "",
    status: "ACTIVE", roles: ["ADMINISTRATEUR"],
    extraCapabilities: ["ANALYTICS_READ", "ANALYTICS_PREVIEW"],
    validFrom: "", validUntil: ""
  };
  Object.keys(overrides || {}).forEach(function (key) { assignment[key] = overrides[key]; });
  return assignment;
}

function AKS_access002Schema11Service_(registry, identity) {
  return AKS_createAccessService_({
    identityProvider: function () { return identity || "manager@example.com"; },
    registryStore: { load: function () { return registry; } },
    courseProvider: { list: function () { return []; } },
    legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00.000Z"); }
  });
}

function AKS_testAccess002Schema11_readsAccess10WithoutWrite_() {
  var fixture = AKS_access002AdminFixture_({
    registry: AKS_access002Schema11Registry_("access/1.0"),
    identity: "manager@example.com"
  });
  var view = fixture.service.readRegistry();
  assertEquals_("access/1.2", view.schemaVersion);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Schema11_rejectsUnknownSchema_() {
  var access = AKS_access002Schema11Service_(
    AKS_access002Schema11Registry_("access/2.0"));
  assertThrows_(function () { access.readRegistryForAdministration(); },
    "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess002Schema11_authorizesIndependentAnalytics_() {
  var registry = AKS_access002Schema11Registry_("access/1.1",
    AKS_access002Schema11AnalyticsAssignment_());
  var access = AKS_access002Schema11Service_(registry);
  assertTrue_(access.assertAnalyticsCapability("ANALYTICS_READ"));
  assertTrue_(access.assertAnalyticsCapability("ANALYTICS_PREVIEW"));
  assertThrows_(function () {
    access.assertAnalyticsCapability("ANALYTICS_PUBLISH");
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testAccess002Schema11_acceptsAnalyticsPublish_() {
  var registry = AKS_access002Schema11Registry_("access/1.1",
    AKS_access002Schema11AnalyticsAssignment_({
      extraCapabilities: ["ANALYTICS_PUBLISH"]
    }));
  assertTrue_(AKS_access002Schema11Service_(registry)
    .assertAnalyticsCapability("ANALYTICS_PUBLISH"));
}

function AKS_testAccess002Schema11_rejectsAnalyticsOutsideModule_() {
  var assignment = AKS_access002Schema11AnalyticsAssignment_({
    module: "", season: "2026-2027", courseCode: "BABY"
  });
  var access = AKS_access002Schema11Service_(
    AKS_access002Schema11Registry_("access/1.1", assignment));
  assertThrows_(function () { access.readRegistryForAdministration(); },
    "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess002Schema11_rejectsInvalidAnalyticsScopeOrCapability_() {
  [{ season: "2026-2027" }, { section: "BABY" }, { courseCode: "BABY" },
    { extraCapabilities: ["ACCESS_MANAGE"] }, { extraCapabilities: [] }]
    .forEach(function (overrides) {
      var access = AKS_access002Schema11Service_(AKS_access002Schema11Registry_(
        "access/1.1", AKS_access002Schema11AnalyticsAssignment_(overrides)));
      assertThrows_(function () { access.readRegistryForAdministration(); },
        "ACCESS_REGISTRY_INVALID");
    });
}

function AKS_testAccess002Schema11_preservesLegacyAnalyticsRead_() {
  var legacy = AKS_access002CatalogueFixture_();
  assertTrue_(legacy.hasCapability("ANALYTICS_READ", "BABY", "2026-2027"));
}

function AKS_testAccess002Schema11_exposesClosedImmutableCatalogue_() {
  var catalogue = AKS.Core.AccessModelCatalogue.get();
  assertEquals_("access/1.2", catalogue.schemaVersion);
  assertEquals_(JSON.stringify(["access/1.0", "access/1.1", "access/1.2"]),
    JSON.stringify(catalogue.readableSchemaVersions));
  assertEquals_(JSON.stringify(["ANALYTICS_READ", "ANALYTICS_PREVIEW", "ANALYTICS_PUBLISH"]),
    JSON.stringify(catalogue.modules.ANALYTICS.capabilities));
  assertTrue_(Object.isFrozen(catalogue));
  assertTrue_(Object.isFrozen(catalogue.modules.ANALYTICS.capabilities));
}

function AKS_testAccess002Schema11_canonicalizesAuthorizedWrite_() {
  var fixture = AKS_access002AdminFixture_({
    registry: AKS_access002Schema11Registry_("access/1.0"),
    identity: "manager@example.com"
  });
  var before = fixture.service.readRegistry();
  var proposed = {
    schemaVersion: "access/1.0",
    accounts: JSON.parse(JSON.stringify(before.accounts))
  };
  var result = fixture.service.updateRegistry({
    expectedRevision: before.revision, registry: proposed
  });
  assertEquals_("access/1.2", result.schemaVersion);
  assertEquals_("access/1.2", fixture.registry().schemaVersion);
  assertEquals_(1, fixture.writes());
}

function AKS_testAccess002Schema11_rejectsUnsafeLegacyAnalyticsWrite_() {
  var legacyAnalytics = AKS_access002Schema11AnalyticsAssignment_({
    module: "", season: "2026-2027", courseCode: "BABY",
    extraCapabilities: ["ANALYTICS_READ"]
  });
  var fixture = AKS_access002AdminFixture_({
    registry: AKS_access002Schema11Registry_("access/1.0", legacyAnalytics),
    identity: "manager@example.com"
  });
  var before = fixture.service.readRegistry();
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: {
        schemaVersion: "access/1.0",
        accounts: JSON.parse(JSON.stringify(before.accounts))
      }
    });
  }, "ACCESS_REGISTRY_INVALID");
  assertEquals_(0, fixture.writes());
}

function AKS_runAccess002Schema11Suite() {
  return AKS_runNamedTestSuite_("ACCESS-002-04 — schéma et catalogues", [
    { name: "lecture 1.0 sans écriture", test: AKS_testAccess002Schema11_readsAccess10WithoutWrite_ },
    { name: "version inconnue refusée", test: AKS_testAccess002Schema11_rejectsUnknownSchema_ },
    { name: "Analytics autonome", test: AKS_testAccess002Schema11_authorizesIndependentAnalytics_ },
    { name: "publication Analytics", test: AKS_testAccess002Schema11_acceptsAnalyticsPublish_ },
    { name: "Analytics hors module refusé", test: AKS_testAccess002Schema11_rejectsAnalyticsOutsideModule_ },
    { name: "forme Analytics fermée", test: AKS_testAccess002Schema11_rejectsInvalidAnalyticsScopeOrCapability_ },
    { name: "lecture Analytics historique", test: AKS_testAccess002Schema11_preservesLegacyAnalyticsRead_ },
    { name: "catalogue fermé immuable", test: AKS_testAccess002Schema11_exposesClosedImmutableCatalogue_ },
    { name: "écriture canonique 1.1", test: AKS_testAccess002Schema11_canonicalizesAuthorizedWrite_ },
    { name: "écriture Analytics historique non sûre refusée", test: AKS_testAccess002Schema11_rejectsUnsafeLegacyAnalyticsWrite_ }
  ]);
}
