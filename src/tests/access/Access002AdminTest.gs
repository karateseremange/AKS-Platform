function AKS_access002CatalogueFixture_(overrides) {
  overrides = overrides || {};
  var registry = overrides.registry || {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "teacher@example.com",
      status: "ACTIVE",
      roles: ["PROFESSEUR"],
      assignments: [{
        courseCode: "BABY",
        season: "2026-2027",
        status: "ACTIVE",
        roles: ["PROFESSEUR"],
        extraCapabilities: ["ANALYTICS_READ"]
      }]
    }]
  };
  return AKS_createAccessService_({
    identityProvider: function () { return "teacher@example.com"; },
    registryStore: { load: function () { return registry; } },
    courseProvider: { list: function () {
      return [{ code: "BABY", season: "2026-2027", active: true }];
    }},
    legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); }
  });
}

function AKS_testAccess002Catalogue_exposesIndependentAnalyticsCapabilities_() {
  var capabilities = AKS_access002CatalogueFixture_().getCapabilityCatalogue()
    .filter(function (capability) { return capability.indexOf("ANALYTICS_") === 0; })
    .sort();
  assertEquals_(JSON.stringify([
    "ANALYTICS_PREVIEW", "ANALYTICS_PUBLISH", "ANALYTICS_READ"
  ]), JSON.stringify(capabilities));
}

function AKS_testAccess002Catalogue_preservesAccess10Compatibility_() {
  var access = AKS_access002CatalogueFixture_();
  assertTrue_(access.hasCapability("ATTENDANCE_READ", "BABY", "2026-2027"));
  assertTrue_(access.hasCapability("ANALYTICS_READ", "BABY", "2026-2027"));
  assertTrue_(!access.hasCapability("ANALYTICS_PREVIEW", "BABY", "2026-2027"));
  assertTrue_(!access.hasCapability("ANALYTICS_PUBLISH", "BABY", "2026-2027"));
}

function AKS_runAccess002AdminSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-01", [
    {
      name: "capacités Analytics indépendantes",
      test: AKS_testAccess002Catalogue_exposesIndependentAnalyticsCapabilities_
    },
    {
      name: "compatibilité access/1.0",
      test: AKS_testAccess002Catalogue_preservesAccess10Compatibility_
    }
  ]);
}
