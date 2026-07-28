function AKS_attendanceWriteFixture_(overrides) {
  var state = {
    session: null,
    attendances: [],
    submissions: {},
    audits: [],
    capabilities: [],
    restored: false
  };
  var options = {
    access: {
      assertCapability: function (capability) { state.capabilities.push(capability); },
      getCurrentIdentity: function () { return "professeur@example.fr"; }
    },
    resolver: {
      resolve: function () {
        return {
          eligibleMembers: [{ id: "LIC-1" }, { id: "LIC-2" }]
        };
      }
    },
    adapter: {
      findSession: function () { return state.session; },
      snapshot: function () {
        return JSON.parse(JSON.stringify({
          session: state.session,
          attendances: state.attendances
        }));
      },
      replaceBatch: function (context, session, attendances) {
        state.session = JSON.parse(JSON.stringify(session));
        state.attendances = JSON.parse(JSON.stringify(attendances));
      },
      verify: function (context, session, attendances) {
        if (state.failVerify) throw new Error("verification");
        assertEquals_(session.version, state.session.version);
        assertEquals_(attendances.length, state.attendances.length);
      },
      restore: function (context, snapshot) {
        if (state.failRestore) throw new Error("restauration");
        state.session = snapshot.session;
        state.attendances = snapshot.attendances;
        state.restored = true;
      },
      getSession: function () { return state.session; }
    },
    lock: {
      acquire: function () { return !state.locked; },
      release: function () { state.released = true; }
    },
    submission_store: {
      get: function (id) { return state.submissions[id] || null; },
      put: function (id, value) { state.submissions[id] = value; }
    },
    clock: function () { return "2026-09-05T18:00:00.000Z"; },
    correlation_id_provider: function () { return "CORR-1"; },
    fingerprint_provider: function (command) { return JSON.stringify(command); },
    session_id_provider: function () { return "SEA-1"; },
    audit: { record: function (event) { state.audits.push(event); } },
    logger: { critical: function (code) { state.critical = code; } }
  };
  Object.keys(overrides || {}).forEach(function (key) { state[key] = overrides[key]; });
  return { state: state, options: options };
}

function AKS_attendanceCommand_(overrides) {
  var command = {
    courseCode: "BABY",
    season: "2026-2027",
    sessionDate: "2026-09-05",
    expectedVersion: 0,
    submissionId: "SUBMISSION-0001",
    targetState: "BROUILLON",
    attendances: [
      { licencieId: "LIC-1", status: "PRESENT" },
      { licencieId: "LIC-2", status: "NON_RENSEIGNE" }
    ]
  };
  Object.keys(overrides || {}).forEach(function (key) { command[key] = overrides[key]; });
  return command;
}

function AKS_testAttendanceWrite_createsDraftBatch_() {
  var fixture = AKS_attendanceWriteFixture_();
  var result = AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
    AKS_attendanceCommand_(), fixture.options);
  assertTrue_(result.ok);
  assertEquals_("SEA-1", result.sessionId);
  assertEquals_("BROUILLON", result.workflowState);
  assertEquals_(1, result.version);
  assertEquals_(2, result.savedCount);
  assertEquals_(1, result.completedCount);
  assertEquals_("ATTENDANCE_READ", fixture.state.capabilities[0]);
  assertEquals_("SESSION_CREATE", fixture.state.capabilities[1]);
}

function AKS_testAttendanceWrite_replaysIdenticalSubmission_() {
  var fixture = AKS_attendanceWriteFixture_();
  var command = AKS_attendanceCommand_();
  var first = AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(command, fixture.options);
  fixture.state.locked = true;
  var replay = AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(command, fixture.options);
  assertSame_(first, replay);
}

function AKS_testAttendanceWrite_rejectsDivergentReplay_() {
  var fixture = AKS_attendanceWriteFixture_();
  AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
    AKS_attendanceCommand_(), fixture.options);
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_({ targetState: "CLOTUREE" }), fixture.options);
  }, "ATTENDANCE_SUBMISSION_CONFLICT");
}

function AKS_testAttendanceWrite_acceptsIncompleteDraft_() {
  var fixture = AKS_attendanceWriteFixture_();
  var result = AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
    AKS_attendanceCommand_(), fixture.options);
  assertEquals_(1, result.completedCount);
}

function AKS_testAttendanceWrite_rejectsIncompleteClosure_() {
  var fixture = AKS_attendanceWriteFixture_();
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.closeAttendanceSession(
      AKS_attendanceCommand_(), fixture.options);
  }, "ATTENDANCE_INCOMPLETE");
}

function AKS_testAttendanceWrite_closesCompleteSession_() {
  var fixture = AKS_attendanceWriteFixture_();
  var command = AKS_attendanceCommand_({
    targetState: "CLOTUREE",
    attendances: [
      { licencieId: "LIC-1", status: "PRESENT" },
      { licencieId: "LIC-2", status: "EXCUSE" }
    ]
  });
  var result = AKS.Analytics.AttendanceWriteService.closeAttendanceSession(
    command, fixture.options);
  assertEquals_("CLOTUREE", result.workflowState);
  assertEquals_("ATTENDANCE_READ", fixture.state.capabilities[0]);
  assertEquals_("SESSION_CLOSE", fixture.state.capabilities[1]);
}

function AKS_testAttendanceWrite_rejectsUnknownMember_() {
  var fixture = AKS_attendanceWriteFixture_();
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_({
        attendances: [{ licencieId: "INCONNU", status: "PRESENT" }]
      }), fixture.options);
  }, "ATTENDANCE_MEMBER_INVALID");
}

function AKS_testAttendanceWrite_rejectsDuplicateMember_() {
  var fixture = AKS_attendanceWriteFixture_();
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_({
        attendances: [
          { licencieId: "LIC-1", status: "PRESENT" },
          { licencieId: "LIC-1", status: "ABSENT" }
        ]
      }), fixture.options);
  }, "ATTENDANCE_MEMBER_INVALID");
}

function AKS_testAttendanceWrite_rejectsUnknownStatus_() {
  var fixture = AKS_attendanceWriteFixture_();
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_({
        attendances: [{ licencieId: "LIC-1", status: "RETARD" }]
      }), fixture.options);
  }, "ATTENDANCE_STATUS_INVALID");
}

function AKS_testAttendanceWrite_rejectsStaleVersion_() {
  var fixture = AKS_attendanceWriteFixture_({
    session: {
      id: "SEA-1", date: "2026-09-05", state: "REALISEE",
      workflowState: "BROUILLON", version: 2
    }
  });
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_({ sessionId: "SEA-1", expectedVersion: 1 }),
      fixture.options);
  }, "ATTENDANCE_VERSION_CONFLICT");
}

function AKS_testAttendanceWrite_requiresCorrectionReason_() {
  var fixture = AKS_attendanceWriteFixture_({
    session: {
      id: "SEA-1", date: "2026-09-05", state: "REALISEE",
      workflowState: "CLOTUREE", version: 1
    }
  });
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.correctClosedAttendance(
      AKS_attendanceCommand_({
        sessionId: "SEA-1", expectedVersion: 1,
        attendances: [
          { licencieId: "LIC-1", status: "PRESENT" },
          { licencieId: "LIC-2", status: "ABSENT" }
        ]
      }), fixture.options);
  }, "ATTENDANCE_COMMAND_INVALID");
}

function AKS_testAttendanceWrite_correctsClosedWithAudit_() {
  var fixture = AKS_attendanceWriteFixture_({
    session: {
      id: "SEA-1", date: "2026-09-05", state: "REALISEE",
      workflowState: "CLOTUREE", version: 1
    }
  });
  var result = AKS.Analytics.AttendanceWriteService.correctClosedAttendance(
    AKS_attendanceCommand_({
      sessionId: "SEA-1", expectedVersion: 1,
      correctionReason: "Erreur de saisie constatée",
      attendances: [
        { licencieId: "LIC-1", status: "PRESENT" },
        { licencieId: "LIC-2", status: "ABSENT" }
      ]
    }), fixture.options);
  assertEquals_(2, result.version);
  assertEquals_("ATTENDANCE_READ", fixture.state.capabilities[0]);
  assertEquals_("ATTENDANCE_CORRECT_CLOSED", fixture.state.capabilities[1]);
  assertEquals_("ATTENDANCE_CORRECT_CLOSED", fixture.state.audits[0].action);
}

function AKS_testAttendanceWrite_rejectsUnavailableLock_() {
  var fixture = AKS_attendanceWriteFixture_({ locked: true });
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_(), fixture.options);
  }, "ATTENDANCE_LOCK_TIMEOUT");
}

function AKS_testAttendanceWrite_rollsBackFailedVerification_() {
  var fixture = AKS_attendanceWriteFixture_({ failVerify: true });
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_(), fixture.options);
  }, "ATTENDANCE_WRITE_FAILED");
  assertTrue_(fixture.state.restored);
  assertEquals_(null, fixture.state.session);
  assertTrue_(fixture.state.released);
}

function AKS_testAttendanceWrite_reportsRollbackFailure_() {
  var fixture = AKS_attendanceWriteFixture_({
    failVerify: true,
    failRestore: true
  });
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_(), fixture.options);
  }, "ATTENDANCE_ROLLBACK_FAILED");
  assertEquals_("ATTENDANCE_ROLLBACK_FAILED", fixture.state.critical);
}


function AKS_testAttendanceWrite_deniesBeforeRepositoryRead_() {
  var fixture = AKS_attendanceWriteFixture_();
  var resolved = false;
  fixture.options.access.assertCapability = function () {
    var failure = new Error("refus");
    failure.code = "ACCESS_DENIED";
    throw failure;
  };
  fixture.options.resolver.resolve = function () {
    resolved = true;
    throw new Error("Le dépôt ne doit pas être lu.");
  };
  assertThrows_(function () {
    AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
      AKS_attendanceCommand_(), fixture.options);
  }, "ACCESS_DENIED");
  assertTrue_(!resolved, "Le classeur ne doit pas être résolu avant autorisation.");
}

function AKS_testAttendanceWrite_composesCentralAccessByDefault_() {
  var fixture = AKS_attendanceWriteFixture_();
  var capabilities = [];
  var factoryCalled = false;
  delete fixture.options.access;
  fixture.options.access_factory = function (courseProvider) {
    factoryCalled = !!courseProvider && typeof courseProvider.list === "function";
    return {
      assertCapability: function (capability) { capabilities.push(capability); },
      getCurrentIdentity: function () { return "professeur@example.fr"; }
    };
  };
  var result = AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(
    AKS_attendanceCommand_(), fixture.options);
  assertTrue_(result.ok);
  assertTrue_(factoryCalled, "Le fournisseur de cours doit alimenter ACCESS-001.");
  assertEquals_("ATTENDANCE_READ", capabilities[0]);
  assertEquals_("SESSION_CREATE", capabilities[1]);
}

function AKS_runAnalyticsAttendanceWriteSuite() {
  return AKS_runNamedTestSuite_("ANALYTICS-SAISIE-002 — écriture", [
    { name: "création brouillon", test: AKS_testAttendanceWrite_createsDraftBatch_ },
    { name: "refus avant lecture", test: AKS_testAttendanceWrite_deniesBeforeRepositoryRead_ },
    { name: "accès central composé", test: AKS_testAttendanceWrite_composesCentralAccessByDefault_ },
    { name: "rejeu identique", test: AKS_testAttendanceWrite_replaysIdenticalSubmission_ },
    { name: "rejeu divergent", test: AKS_testAttendanceWrite_rejectsDivergentReplay_ },
    { name: "brouillon incomplet", test: AKS_testAttendanceWrite_acceptsIncompleteDraft_ },
    { name: "clôture incomplète", test: AKS_testAttendanceWrite_rejectsIncompleteClosure_ },
    { name: "clôture complète", test: AKS_testAttendanceWrite_closesCompleteSession_ },
    { name: "licencié inconnu", test: AKS_testAttendanceWrite_rejectsUnknownMember_ },
    { name: "licencié dupliqué", test: AKS_testAttendanceWrite_rejectsDuplicateMember_ },
    { name: "statut inconnu", test: AKS_testAttendanceWrite_rejectsUnknownStatus_ },
    { name: "version périmée", test: AKS_testAttendanceWrite_rejectsStaleVersion_ },
    { name: "motif obligatoire", test: AKS_testAttendanceWrite_requiresCorrectionReason_ },
    { name: "correction auditée", test: AKS_testAttendanceWrite_correctsClosedWithAudit_ },
    { name: "verrou indisponible", test: AKS_testAttendanceWrite_rejectsUnavailableLock_ },
    { name: "restauration", test: AKS_testAttendanceWrite_rollsBackFailedVerification_ },
    { name: "échec restauration", test: AKS_testAttendanceWrite_reportsRollbackFailure_ }
  ]);
}
