/**
 * Runs AKS Platform release version tests.
 *
 * @returns {Object}
 */
function AKS_runPlatformVersionTests() {
  var tests = [
    test_PlatformVersion_returnsExpectedReleaseInfo,
    test_PlatformVersion_doesNotExposeMutableState
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
    feature: "PLATFORM-VERSION",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
