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

function AKS_access002AdminFixture_(overrides) {
  overrides = overrides || {};
  var registry = Object.prototype.hasOwnProperty.call(overrides, "registry")
    ? overrides.registry : {
      schemaVersion: "access/1.0",
      accounts: [{
        email: "admin@example.com",
        displayName: "Gestionnaire",
        status: "ACTIVE",
        roles: ["ADMINISTRATEUR"],
        assignments: [],
        updatedAt: "2026-08-09T12:00:00Z",
        updatedBy: " ADMIN@EXAMPLE.COM "
      }, {
        email: "teacher@example.com",
        status: "ACTIVE",
        roles: ["PROFESSEUR"],
        assignments: [{
          courseCode: "BABY",
          season: "2026-2027",
          status: "ACTIVE",
          roles: ["PROFESSEUR"]
        }]
      }]
    };
  var writes = 0;
  var access = AKS_createAccessService_({
    identityProvider: function () {
      return overrides.identity || "admin@example.com";
    },
    registryStore: {
      load: function () { return registry; },
      save: function () { writes += 1; }
    },
    courseProvider: { list: function () {
      return [{ code: "BABY", season: "2026-2027", active: true }];
    }},
    legacyAdminEmails: overrides.legacyAdminEmails || [],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); }
  });
  return {
    service: AKS_createAccessAdminService_({ accessService: access }),
    writes: function () { return writes; }
  };
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

function AKS_testAccess002Admin_readsRegistryWithAccessManage_() {
  var fixture = AKS_access002AdminFixture_();
  var view = fixture.service.readRegistry();
  assertEquals_("access/1.0", view.schemaVersion);
  assertEquals_(2, view.accounts.length);
  assertEquals_("admin@example.com", view.accounts[0].updatedBy);
  assertEquals_(false, view.bootstrap);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Admin_rejectsGlobalReadWithoutAccessManage_() {
  var fixture = AKS_access002AdminFixture_({ identity: "teacher@example.com" });
  assertThrows_(function () { fixture.service.readRegistry(); },
    "ACCESS_CAPABILITY_DENIED");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Admin_preservesLegacyBootstrapReadOnly_() {
  var fixture = AKS_access002AdminFixture_({
    registry: null,
    identity: "legacy@example.com",
    legacyAdminEmails: ["legacy@example.com"]
  });
  var view = fixture.service.readRegistry();
  assertEquals_(true, view.bootstrap);
  assertEquals_(0, view.accounts.length);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Admin_returnsImmutableDefensiveView_() {
  var fixture = AKS_access002AdminFixture_();
  var first = fixture.service.readRegistry();
  assertTrue_(Object.isFrozen(first));
  assertTrue_(Object.isFrozen(first.accounts));
  assertTrue_(Object.isFrozen(first.accounts[0]));
  try { first.accounts[0].displayName = "Altéré"; } catch (ignored) {}
  var second = fixture.service.readRegistry();
  assertEquals_("Gestionnaire", second.accounts[0].displayName);
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
    },
    {
      name: "lecture globale protégée",
      test: AKS_testAccess002Admin_readsRegistryWithAccessManage_
    },
    {
      name: "lecture globale refusée",
      test: AKS_testAccess002Admin_rejectsGlobalReadWithoutAccessManage_
    },
    {
      name: "bootstrap historique en lecture seule",
      test: AKS_testAccess002Admin_preservesLegacyBootstrapReadOnly_
    },
    {
      name: "vue défensive immuable",
      test: AKS_testAccess002Admin_returnsImmutableDefensiveView_
    }
  ]);
}
