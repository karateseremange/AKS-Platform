var AKS = AKS || {};

/**
 * Centralized AKS Platform V1.1 validation suite.
 *
 * Runs the verified VERSION-001, ADMIN-001 and DASHBOARD-001 tests and emits
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
    { name: "DASHBOARD-001 / defensive copies", test: AKS_testDashboard001ReturnsDefensiveCopies_ }
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
