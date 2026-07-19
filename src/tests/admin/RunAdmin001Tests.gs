/**
 * Runs ADMIN-001 Dashboard tests.
 *
 * @returns {Object}
 */
function AKS_runAdmin001Tests() {
  var tests = [
    AKS_testAdminDashboard_authorizesConfiguredAdministrator,
    AKS_testAdminDashboard_rejectsUnknownAdministrator,
    AKS_testAdminDashboard_rejectsEmptyInjectedAuthorizationList,
    AKS_testAdminDashboard_buildsDeclarativeViewModel,
    AKS_testAdminDashboard_keepsReleaseDataImmutable
  ];
  var passed = 0;
  var results = [];

  tests.forEach(function (testCase) {
    testCase();
    passed += 1;
    results.push({
      name: testCase.name,
      status: "PASSED"
    });
  });

  var report = {
    ok: true,
    feature: "ADMIN-001",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
