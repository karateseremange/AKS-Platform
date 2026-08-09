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
        assignments: [{
          module: "ACCESS", season: "*", status: "ACTIVE",
          roles: ["ADMINISTRATEUR"], extraCapabilities: ["ACCESS_MANAGE"]
        }],
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
  var clears = 0;
  var lockAttempts = 0;
  var lockReleases = 0;
  var saveAttempt = 0;
  var auditAttempt = 0;
  var auditEvents = [];
  var access = AKS_createAccessService_({
    identityProvider: function () {
      return overrides.identity || "admin@example.com";
    },
    registryStore: {
      load: function () { return registry; },
      save: function (next) {
        writes += 1;
        saveAttempt += 1;
        if (overrides.failSaveAt === saveAttempt) {
          throw new Error("Panne d'écriture injectée.");
        }
        registry = overrides.alterFirstSave && saveAttempt === 1
          ? JSON.parse(JSON.stringify(next)) : next;
        if (overrides.alterFirstSave && saveAttempt === 1) {
          registry.accounts[0].displayName = "Altération injectée";
        }
      },
      clear: function () { clears += 1; registry = null; }
    },
    courseProvider: { list: function () {
      return [{ code: "BABY", season: "2026-2027", active: true }];
    }},
    legacyAdminEmails: overrides.legacyAdminEmails || [],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); },
    correlationIdProvider: function () { return "corr-access-002-01"; },
    audit: {
      record: function (event) {
        auditAttempt += 1;
        if (overrides.failAuditAt === auditAttempt) {
          throw new Error("Panne d'audit injectée.");
        }
        auditEvents.push(JSON.parse(JSON.stringify(event)));
        return { auditId: "audit-" + auditAttempt };
      },
      recordUnderExistingLock: function (event) {
        if (lockAttempts !== lockReleases + 1) {
          throw new Error("Le verrou partagé n'est pas détenu.");
        }
        return this.record(event);
      },
      isPersistentRecipeAudit: function () {
        return overrides.persistentAudit !== false;
      }
    },
    registryLock: {
      tryLock: function (timeout) {
        lockAttempts += 1;
        if (typeof overrides.beforeLock === "function") {
          overrides.beforeLock(function (next) { registry = next; });
        }
        return overrides.lockAvailable !== false && timeout === 30000;
      },
      releaseLock: function () { lockReleases += 1; }
    }
  });
  return {
    service: AKS_createAccessAdminService_({ accessService: access }),
    writes: function () { return writes; },
    clears: function () { return clears; },
    lockAttempts: function () { return lockAttempts; },
    lockReleases: function () { return lockReleases; },
    auditEvents: auditEvents,
    registry: function () { return registry; }
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

function AKS_access002UpdatedRegistry_(view) {
  var registry = {
    schemaVersion: view.schemaVersion,
    accounts: JSON.parse(JSON.stringify(view.accounts))
  };
  registry.accounts[1].displayName = "Professeur modifié";
  return registry;
}

function AKS_testAccess002Admin_writesAtomicallyWithServerMetadata_() {
  var fixture = AKS_access002AdminFixture_();
  var before = fixture.service.readRegistry();
  var result = fixture.service.updateRegistry({
    expectedRevision: before.revision,
    registry: AKS_access002UpdatedRegistry_(before)
  });
  assertEquals_(1, fixture.writes());
  assertEquals_(1, fixture.lockAttempts());
  assertEquals_(1, fixture.lockReleases());
  assertEquals_("Professeur modifié", result.accounts[1].displayName);
  assertEquals_("2026-09-01T10:00:00.000Z", result.accounts[1].updatedAt);
  assertEquals_("admin@example.com", result.accounts[1].updatedBy);
  assertTrue_(result.revision !== before.revision);
  assertEquals_("corr-access-002-01", result.correlationId);
  assertTrue_(Object.isFrozen(result));
}

function AKS_testAccess002Admin_persistsCorrelatedBeforeAfterAudit_() {
  var fixture = AKS_access002AdminFixture_();
  var before = fixture.service.readRegistry();
  fixture.service.updateRegistry({
    expectedRevision: before.revision,
    registry: AKS_access002UpdatedRegistry_(before)
  });
  assertEquals_(2, fixture.auditEvents.length);
  assertEquals_("INTENTION", fixture.auditEvents[0].result);
  assertEquals_("ADMIN", fixture.auditEvents[0].actorType);
  assertEquals_("REUSSI", fixture.auditEvents[1].result);
  assertEquals_(fixture.auditEvents[0].correlationId, fixture.auditEvents[1].correlationId);
  assertEquals_("ACCESS_REGISTRY", fixture.auditEvents[0].targetType);
  assertEquals_("teacher@example.com",
    fixture.auditEvents[0].metadata.changedAccountIds[0]);
  assertTrue_(fixture.auditEvents[0].metadata.beforeRevision !==
    fixture.auditEvents[0].metadata.proposedRevision);
  assertEquals_(fixture.auditEvents[1].metadata.proposedRevision,
    fixture.auditEvents[1].metadata.afterRevision);
}

function AKS_testAccess002Admin_refusesMutationWithoutPersistentAudit_() {
  var fixture = AKS_access002AdminFixture_({ persistentAudit: false });
  var before = fixture.service.readRegistry();
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: AKS_access002UpdatedRegistry_(before)
    });
  }, "ACCESS_AUDIT_REQUIRED");
  assertEquals_(0, fixture.lockAttempts());
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Admin_restoresRegistryWhenFinalAuditFails_() {
  var fixture = AKS_access002AdminFixture_({ failAuditAt: 2 });
  var before = fixture.service.readRegistry();
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: AKS_access002UpdatedRegistry_(before)
    });
  }, "ACCESS_AUDIT_REQUIRED");
  assertEquals_(2, fixture.writes());
  assertEquals_("", fixture.registry().accounts[1].displayName);
  assertEquals_(2, fixture.auditEvents.length);
  assertEquals_("INTENTION", fixture.auditEvents[0].result);
  assertEquals_("ECHEC", fixture.auditEvents[1].result);
  assertEquals_(true, fixture.auditEvents[1].metadata.restored);
  assertEquals_(fixture.auditEvents[1].metadata.beforeRevision,
    fixture.auditEvents[1].metadata.afterRevision);
}

function AKS_testAccess002Admin_auditsRefusalWithoutWrite_() {
  var fixture = AKS_access002AdminFixture_({ identity: "teacher@example.com" });
  assertThrows_(function () {
    fixture.service.updateRegistry({ expectedRevision: "forbidden", registry: {} });
  }, "ACCESS_CAPABILITY_DENIED");
  assertEquals_(0, fixture.writes());
  assertEquals_(1, fixture.auditEvents.length);
  assertEquals_("USER", fixture.auditEvents[0].actorType);
  assertEquals_("REFUSE", fixture.auditEvents[0].result);
  assertEquals_("ACCESS_CAPABILITY_DENIED", fixture.auditEvents[0].reasonCode);
}

function AKS_testAccess002Admin_rejectsWriteBeforeLockWithoutAccessManage_() {
  var fixture = AKS_access002AdminFixture_({ identity: "teacher@example.com" });
  assertThrows_(function () {
    fixture.service.updateRegistry({ expectedRevision: "forbidden", registry: {} });
  }, "ACCESS_CAPABILITY_DENIED");
  assertEquals_(0, fixture.lockAttempts());
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Admin_rejectsInvalidIdentityDatesAndScope_() {
  var cases = [{
    mutate: function (registry) { registry.accounts[1].email = "adresse-invalide"; }
  }, {
    mutate: function (registry) { registry.accounts[1].validFrom = "2026-02-30"; }
  }, {
    mutate: function (registry) {
      registry.accounts[1].validFrom = "2026-10-01";
      registry.accounts[1].validUntil = "2026-09-01";
    }
  }, {
    mutate: function (registry) { registry.accounts[1].assignments[0].courseCode = "INCONNU"; }
  }];
  cases.forEach(function (entry) {
    var fixture = AKS_access002AdminFixture_();
    var view = fixture.service.readRegistry();
    var registry = AKS_access002UpdatedRegistry_(view);
    entry.mutate(registry);
    assertThrows_(function () {
      fixture.service.updateRegistry({
        expectedRevision: view.revision,
        registry: registry
      });
    }, "ACCESS_REGISTRY_INVALID");
    assertEquals_(0, fixture.lockAttempts());
    assertEquals_(0, fixture.writes());
  });
}

function AKS_testAccess002Admin_rejectsConcurrentRevision_() {
  var concurrentRegistry = {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "admin@example.com", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", status: "ACTIVE",
        roles: ["ADMINISTRATEUR"], extraCapabilities: ["ACCESS_MANAGE"]
      }], displayName: "Concurrent"
    }]
  };
  var fixture = AKS_access002AdminFixture_({
    beforeLock: function (replace) { replace(concurrentRegistry); }
  });
  var before = fixture.service.readRegistry();
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: AKS_access002UpdatedRegistry_(before)
    });
  }, "ACCESS_REGISTRY_CONFLICT");
  assertEquals_(0, fixture.writes());
  assertEquals_(1, fixture.lockReleases());
  assertEquals_("Concurrent", fixture.registry().accounts[0].displayName);
}

function AKS_testAccess002Admin_restoresPreviousRegistryAfterVerificationFailure_() {
  var fixture = AKS_access002AdminFixture_({ alterFirstSave: true });
  var before = fixture.service.readRegistry();
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: AKS_access002UpdatedRegistry_(before)
    });
  }, "ACCESS_REGISTRY_WRITE_FAILED");
  assertEquals_(2, fixture.writes());
  assertEquals_(1, fixture.lockReleases());
  assertEquals_("Gestionnaire", fixture.registry().accounts[0].displayName);
  assertEquals_("teacher@example.com", fixture.registry().accounts[1].email);
}

function AKS_testAccess002Admin_rejectsUnavailableLockWithoutWrite_() {
  var fixture = AKS_access002AdminFixture_({ lockAvailable: false });
  var before = fixture.service.readRegistry();
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: AKS_access002UpdatedRegistry_(before)
    });
  }, "ACCESS_REGISTRY_LOCK_UNAVAILABLE");
  assertEquals_(0, fixture.writes());
  assertEquals_(0, fixture.lockReleases());
}

function AKS_testAccess002Admin_preservesLastEffectiveManager_() {
  var fixture = AKS_access002AdminFixture_();
  var before = fixture.service.readRegistry();
  var registry = AKS_access002UpdatedRegistry_(before);
  registry.accounts[0].status = "INACTIVE";
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: registry
    });
  }, "ACCESS_LAST_MANAGER_REQUIRED");
  assertEquals_(0, fixture.writes());
  assertEquals_(1, fixture.lockReleases());
}

function AKS_testAccess002Admin_reactivationClearsFormerAssignments_() {
  var inactiveRegistry = {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "admin@example.com", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", status: "ACTIVE",
        roles: ["ADMINISTRATEUR"], extraCapabilities: ["ACCESS_MANAGE"]
      }]
    }, {
      email: "teacher@example.com", status: "INACTIVE",
      roles: ["PROFESSEUR"], assignments: [{
        courseCode: "BABY", season: "2026-2027", status: "ACTIVE",
        roles: ["PROFESSEUR"]
      }]
    }]
  };
  var fixture = AKS_access002AdminFixture_({ registry: inactiveRegistry });
  var before = fixture.service.readRegistry();
  var registry = {
    schemaVersion: before.schemaVersion,
    accounts: JSON.parse(JSON.stringify(before.accounts))
  };
  registry.accounts[1].status = "ACTIVE";
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: registry
    });
  }, "ACCESS_REGISTRY_INVALID");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Admin_preservesInactiveHistoricalScope_() {
  var fixture = AKS_access002AdminFixture_();
  var before = fixture.service.readRegistry();
  var registry = AKS_access002UpdatedRegistry_(before);
  registry.accounts[1].status = "INACTIVE";
  registry.accounts[1].assignments[0].courseCode = "ARCHIVE";
  var result = fixture.service.updateRegistry({
    expectedRevision: before.revision,
    registry: registry
  });
  assertEquals_("INACTIVE", result.accounts[1].status);
  assertEquals_("ARCHIVE", result.accounts[1].assignments[0].courseCode);
  assertEquals_(1, fixture.writes());
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
    },
    {
      name: "écriture atomique et métadonnées serveur",
      test: AKS_testAccess002Admin_writesAtomicallyWithServerMetadata_
    },
    {
      name: "audit persistant avant après corrélé",
      test: AKS_testAccess002Admin_persistsCorrelatedBeforeAfterAudit_
    },
    {
      name: "audit persistant obligatoire avant mutation",
      test: AKS_testAccess002Admin_refusesMutationWithoutPersistentAudit_
    },
    {
      name: "restauration après échec de preuve finale",
      test: AKS_testAccess002Admin_restoresRegistryWhenFinalAuditFails_
    },
    {
      name: "refus audité sans écriture",
      test: AKS_testAccess002Admin_auditsRefusalWithoutWrite_
    },
    {
      name: "écriture refusée avant verrou",
      test: AKS_testAccess002Admin_rejectsWriteBeforeLockWithoutAccessManage_
    },
    {
      name: "validation stricte avant verrou",
      test: AKS_testAccess002Admin_rejectsInvalidIdentityDatesAndScope_
    },
    {
      name: "conflit de révision",
      test: AKS_testAccess002Admin_rejectsConcurrentRevision_
    },
    {
      name: "restauration après échec de vérification",
      test: AKS_testAccess002Admin_restoresPreviousRegistryAfterVerificationFailure_
    },
    {
      name: "verrou indisponible",
      test: AKS_testAccess002Admin_rejectsUnavailableLockWithoutWrite_
    },
    {
      name: "dernier gestionnaire effectif",
      test: AKS_testAccess002Admin_preservesLastEffectiveManager_
    },
    {
      name: "réactivation sans anciennes habilitations",
      test: AKS_testAccess002Admin_reactivationClearsFormerAssignments_
    },
    {
      name: "périmètre historique inactif conservé",
      test: AKS_testAccess002Admin_preservesInactiveHistoricalScope_
    }
  ]);
}
