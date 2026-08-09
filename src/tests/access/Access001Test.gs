function AKS_access001Fixture_(overrides) {
  overrides = overrides || {};
  var stored = Object.prototype.hasOwnProperty.call(overrides, "registry")
    ? overrides.registry : {
      schemaVersion: "access/1.0",
      accounts: [
        {
          email: "teacher@example.com",
          status: "ACTIVE",
          roles: ["PROFESSEUR"],
          assignments: [{
            courseCode: "BABY", season: "2026-2027", status: "ACTIVE",
            roles: ["PROFESSEUR"]
          }]
        },
        {
          email: "assistant@example.com",
          status: "ACTIVE",
          roles: ["ASSISTANT_AFA"],
          assignments: [{
            courseCode: "BABY", season: "2026-2027", status: "ACTIVE",
            roles: ["ASSISTANT_AFA"]
          }]
        },
        {
          email: "reader@example.com",
          status: "ACTIVE",
          roles: ["CONSULTATION"],
          assignments: [{
            courseCode: "ENFANT1", season: "2026-2027", status: "ACTIVE",
            roles: ["CONSULTATION"]
          }]
        },
        {
          email: "admin@example.com",
          status: "ACTIVE",
          roles: ["ADMINISTRATEUR"],
          assignments: [{
            module: "ACCESS", season: "*", status: "ACTIVE",
            roles: ["ADMINISTRATEUR"], extraCapabilities: ["ACCESS_MANAGE"]
          }]
        }
      ]
    };
  var identity = Object.prototype.hasOwnProperty.call(overrides, "identity")
    ? overrides.identity : "teacher@example.com";
  var saved = null;
  var auditEvents = [];
  function recordAudit_(event) {
    auditEvents.push(event);
    return { persisted: true };
  }
  var service = AKS_createAccessService_({
    identityProvider: function () { return identity; },
    registryStore: {
      load: function () { return stored; },
      save: function (registry) { stored = registry; saved = registry; },
      clear: function () { stored = null; saved = null; }
    },
    courseProvider: { list: function () {
      return [
        { code: "BABY", season: "2026-2027", active: true },
        { code: "ENFANT1", season: "2026-2027", active: true }
      ];
    }},
    legacyAdminEmails: ["legacy@example.com"],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); },
    registryLock: {
      tryLock: function () { return true; },
      releaseLock: function () {}
    },
    audit: {
      record: recordAudit_,
      recordUnderExistingLock: recordAudit_,
      isPersistentRecipeAudit: function () { return true; }
    },
    correlationIdProvider: function () { return "corr-access-001"; }
  });
  return {
    service: service,
    saved: function () { return saved; },
    auditEvents: auditEvents
  };
}

function AKS_testAccess001_rejectsMissingIdentity_() {
  var fixture = AKS_access001Fixture_({ identity: "" });
  assertThrows_(function () { fixture.service.getEffectiveAccessContext(); }, "ACCESS_AUTH_REQUIRED");
}

function AKS_testAccess001_normalizesIdentity_() {
  var fixture = AKS_access001Fixture_({ identity: "  TEACHER@EXAMPLE.COM " });
  assertEquals_("teacher@example.com", fixture.service.getCurrentIdentity());
}

function AKS_testAccess001_rejectsUnknownAccount_() {
  var fixture = AKS_access001Fixture_({ identity: "unknown@example.com" });
  assertThrows_(function () {
    fixture.service.assertCapability("ATTENDANCE_READ", "BABY", "2026-2027");
  }, "ACCESS_DENIED");
}

function AKS_testAccess001_rejectsDuplicateAccount_() {
  var fixture = AKS_access001Fixture_();
  var registry = {
    schemaVersion: "access/1.0",
    accounts: [
      { email: "teacher@example.com", status: "ACTIVE", roles: ["PROFESSEUR"], assignments: [] },
      { email: " TEACHER@example.com ", status: "ACTIVE", roles: ["PROFESSEUR"], assignments: [] }
    ]
  };
  fixture = AKS_access001Fixture_({ registry: registry });
  assertThrows_(function () {
    fixture.service.assertCapability("ATTENDANCE_READ", "BABY", "2026-2027");
  }, "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess001_limitsTeacherToAssignment_() {
  var fixture = AKS_access001Fixture_();
  assertTrue_(fixture.service.hasCapability("SESSION_CLOSE", "BABY", "2026-2027"));
  assertTrue_(!fixture.service.hasCapability("ATTENDANCE_READ", "ENFANT1", "2026-2027"));
}

function AKS_testAccess001_limitsAssistant_() {
  var fixture = AKS_access001Fixture_({ identity: "assistant@example.com" });
  assertTrue_(fixture.service.hasCapability("ATTENDANCE_WRITE_DRAFT", "BABY", "2026-2027"));
  assertTrue_(!fixture.service.hasCapability("SESSION_CLOSE", "BABY", "2026-2027"));
}

function AKS_testAccess001_keepsConsultationReadOnly_() {
  var fixture = AKS_access001Fixture_({ identity: "reader@example.com" });
  assertTrue_(fixture.service.hasCapability("ATTENDANCE_READ", "ENFANT1", "2026-2027"));
  assertTrue_(!fixture.service.hasCapability("SESSION_CREATE", "ENFANT1", "2026-2027"));
}

function AKS_testAccess001_keepsAdministratorRoleDescriptive_() {
  var fixture = AKS_access001Fixture_({ identity: "admin@example.com" });
  assertTrue_(!fixture.service.hasCapability(
    "ATTENDANCE_READ", "ENFANT1", "2026-2027"));
  assertTrue_(fixture.service.assertAdministrativeCapability("ACCESS_MANAGE"));
}

function AKS_testAccess001_rejectsInvalidScope_() {
  var fixture = AKS_access001Fixture_();
  assertThrows_(function () {
    fixture.service.assertCapability("ATTENDANCE_READ", "FAKE", "2026-2027");
  }, "ACCESS_SCOPE_INVALID");
}

function AKS_testAccess001_rejectsUnknownRole_() {
  var fixture = AKS_access001Fixture_({ registry: {
    schemaVersion: "access/1.0",
    accounts: [{ email: "teacher@example.com", status: "ACTIVE", roles: ["ROOT"], assignments: [] }]
  }});
  assertThrows_(function () {
    fixture.service.assertCapability("ATTENDANCE_READ", "BABY", "2026-2027");
  }, "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess001_rejectsUnknownSchema_() {
  var fixture = AKS_access001Fixture_({ registry: { schemaVersion: "access/9", accounts: [] } });
  assertThrows_(function () {
    fixture.service.assertCapability("ATTENDANCE_READ", "BABY", "2026-2027");
  }, "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess001_preservesLegacyBootstrap_() {
  var fixture = AKS_access001Fixture_({ registry: null, identity: "legacy@example.com" });
  assertTrue_(fixture.service.hasCapability("ACCESS_MANAGE", "BABY", "2026-2027"));
}

function AKS_testAccess001_doesNotBootstrapUnknownUser_() {
  var fixture = AKS_access001Fixture_({ registry: null, identity: "unknown@example.com" });
  assertThrows_(function () {
    fixture.service.assertCapability("ATTENDANCE_READ", "BABY", "2026-2027");
  }, "ACCESS_DENIED");
}

function AKS_testAccess001_listsOnlyAuthorizedCourses_() {
  var fixture = AKS_access001Fixture_();
  var courses = fixture.service.listAuthorizedCourses("COURSE_LIST");
  assertEquals_(1, courses.length);
  assertEquals_("BABY", courses[0].code);
}

function AKS_testAccess001_rejectsLastAdministratorRemoval_() {
  var fixture = AKS_access001Fixture_({ identity: "admin@example.com" });
  assertThrows_(function () {
    fixture.service.saveRegistry({
      schemaVersion: "access/1.0",
      accounts: [{
        email: "teacher@example.com", status: "ACTIVE",
        roles: ["PROFESSEUR"], assignments: []
      }]
    });
  }, "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess001_savesAndAuditsRegistry_() {
  var fixture = AKS_access001Fixture_({ identity: "admin@example.com" });
  fixture.service.saveRegistry({
    schemaVersion: "access/1.0",
    accounts: [{
      email: "admin@example.com", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", status: "ACTIVE",
        roles: ["ADMINISTRATEUR"], extraCapabilities: ["ACCESS_MANAGE"]
      }]
    }]
  });
  assertTrue_(fixture.saved() !== null, "Le registre validé doit être persisté.");
  assertEquals_(2, fixture.auditEvents.length);
  assertEquals_("ACCESS_REGISTRY_UPDATE", fixture.auditEvents[0].action);
  assertEquals_("INTENTION", fixture.auditEvents[0].result);
  assertEquals_("REUSSI", fixture.auditEvents[1].result);
}

function AKS_testAccess001_rejectsUnauthorizedRegistryWrite_() {
  var fixture = AKS_access001Fixture_({ identity: "teacher@example.com" });
  assertThrows_(function () {
    fixture.service.saveRegistry({
      schemaVersion: "access/1.0",
      accounts: [{
        email: "admin@example.com", status: "ACTIVE",
        roles: ["ADMINISTRATEUR"], assignments: []
      }]
    });
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testAccess001_rejectsExpiredAssignment_() {
  var registry = {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "teacher@example.com", status: "ACTIVE", roles: ["PROFESSEUR"],
      assignments: [{
        courseCode: "BABY", season: "2026-2027", status: "ACTIVE",
        roles: ["PROFESSEUR"], validUntil: "2026-08-31"
      }]
    }, {
      email: "admin@example.com", status: "ACTIVE", roles: ["ADMINISTRATEUR"], assignments: []
    }]
  };
  var fixture = AKS_access001Fixture_({ registry: registry });
  assertTrue_(!fixture.service.hasCapability("ATTENDANCE_READ", "BABY", "2026-2027"));
}

function AKS_runAccess001Suite() {
  return AKS_runNamedTestSuite_("ACCESS-001", [
    { name: "identité absente", test: AKS_testAccess001_rejectsMissingIdentity_ },
    { name: "identité normalisée", test: AKS_testAccess001_normalizesIdentity_ },
    { name: "compte inconnu", test: AKS_testAccess001_rejectsUnknownAccount_ },
    { name: "compte dupliqué", test: AKS_testAccess001_rejectsDuplicateAccount_ },
    { name: "professeur limité", test: AKS_testAccess001_limitsTeacherToAssignment_ },
    { name: "assistant limité", test: AKS_testAccess001_limitsAssistant_ },
    { name: "consultation seule", test: AKS_testAccess001_keepsConsultationReadOnly_ },
    { name: "rôle administrateur descriptif", test: AKS_testAccess001_keepsAdministratorRoleDescriptive_ },
    { name: "périmètre invalide", test: AKS_testAccess001_rejectsInvalidScope_ },
    { name: "rôle inconnu", test: AKS_testAccess001_rejectsUnknownRole_ },
    { name: "schéma inconnu", test: AKS_testAccess001_rejectsUnknownSchema_ },
    { name: "amorçage historique", test: AKS_testAccess001_preservesLegacyBootstrap_ },
    { name: "amorçage refusé", test: AKS_testAccess001_doesNotBootstrapUnknownUser_ },
    { name: "cours autorisés", test: AKS_testAccess001_listsOnlyAuthorizedCourses_ },
    { name: "dernier administrateur", test: AKS_testAccess001_rejectsLastAdministratorRemoval_ },
    { name: "registre audité", test: AKS_testAccess001_savesAndAuditsRegistry_ },
    { name: "écriture registre refusée", test: AKS_testAccess001_rejectsUnauthorizedRegistryWrite_ },
    { name: "affectation expirée", test: AKS_testAccess001_rejectsExpiredAssignment_ }
  ]);
}
