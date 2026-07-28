function AKS_attendanceServerApiFixture_(overrides) {
  overrides = overrides || {};
  var state = { saved: null };
  var access = overrides.access || {
    getEffectiveAccessContext: function () {
      return {
        email: "teacher@example.com",
        bootstrap: false,
        courses: [{ code: "BABY", season: "2026-2027", secret: "hidden" }]
      };
    }
  };
  var writeService = overrides.writeService || {
    saveAttendanceBatch: function (command) {
      state.saved = command;
      return { ok: true, sessionId: "SEA-1", workflowState: "BROUILLON" };
    }
  };
  return {
    state: state,
    api: AKS_createAttendanceServerApi_({
      access: access,
      writeService: writeService
    })
  };
}

function AKS_testAttendanceServer_exposesSafeAccessContext_() {
  var fixture = AKS_attendanceServerApiFixture_();
  var result = fixture.api.getAccessContext();
  assertTrue_(result.ok);
  assertEquals_("teacher@example.com", result.data.identity);
  assertEquals_(1, result.data.courses.length);
  assertEquals_("BABY", result.data.courses[0].code);
  assertEquals_(undefined, result.data.courses[0].secret);
}

function AKS_testAttendanceServer_refusesBeforeWrite_() {
  var called = false;
  var denied = new Error("private details");
  denied.code = "ACCESS_DENIED";
  var fixture = AKS_attendanceServerApiFixture_({
    writeService: {
      saveAttendanceBatch: function () {
        called = true;
        throw denied;
      }
    }
  });
  var result = fixture.api.saveAttendanceBatch({ courseCode: "BABY" });
  assertTrue_(called);
  assertTrue_(!result.ok);
  assertEquals_("ACCESS_DENIED", result.error.code);
  assertEquals_("Accès non autorisé.", result.error.message);
}

function AKS_testAttendanceServer_ignoresClientDependencies_() {
  var fixture = AKS_attendanceServerApiFixture_();
  var command = {
    courseCode: "BABY",
    season: "2026-2027",
    access: { assertCapability: function () { throw new Error("injected"); } },
    resolver: { spreadsheetId: "client-controlled" }
  };
  var result = fixture.api.saveAttendanceBatch(command);
  assertTrue_(result.ok);
  assertSame_(command, fixture.state.saved);
}

function AKS_testAttendanceServer_hidesUnexpectedFailure_() {
  var fixture = AKS_attendanceServerApiFixture_({
    writeService: {
      saveAttendanceBatch: function () {
        throw new Error("Spreadsheet 1-secret-id internal failure");
      }
    }
  });
  var result = fixture.api.saveAttendanceBatch({});
  assertTrue_(!result.ok);
  assertEquals_("ATTENDANCE_SERVER_ERROR", result.error.code);
  assertEquals_("Le service de saisie est temporairement indisponible.",
    result.error.message);
}

function AKS_runAttendanceServerApiSuite() {
  return AKS_runNamedTestSuite_("ACCESS-001 — exposition serveur", [
    { name: "contexte public minimal", test: AKS_testAttendanceServer_exposesSafeAccessContext_ },
    { name: "refus serveur nettoyé", test: AKS_testAttendanceServer_refusesBeforeWrite_ },
    { name: "dépendances client ignorées", test: AKS_testAttendanceServer_ignoresClientDependencies_ },
    { name: "erreur interne masquée", test: AKS_testAttendanceServer_hidesUnexpectedFailure_ }
  ]);
}
