function AKS_testAnalyticsGoldDatasets_coverValidatedCorpus_() {
  var datasets = AKS.Tests.AnalyticsGoldDatasets;
  assertEquals_(10, datasets.length, "Le corpus doit contenir dix jeux d'or.");
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.validate(datasets).length);
}

function AKS_testAnalyticsGoldDatasets_areDeeplyImmutable_() {
  var datasets = AKS.Tests.AnalyticsGoldDatasets;
  assertTrue_(Object.isFrozen(datasets), "La collection doit être immuable.");
  datasets.forEach(function (dataset) {
    assertTrue_(Object.isFrozen(dataset), dataset.id + " doit être immuable.");
    assertTrue_(Object.isFrozen(dataset.input), dataset.id + ".input doit être immuable.");
    assertTrue_(Object.isFrozen(dataset.expected), dataset.id + ".expected doit être immuable.");
  });
}

function AKS_testAnalyticsGoldDatasets_areReproducible_() {
  var datasets = AKS.Tests.AnalyticsGoldDatasets;
  var copy = JSON.parse(JSON.stringify(datasets));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(datasets, copy).length);
}

function AKS_testAnalyticsGoldDatasetComparator_reportsPrecisePath_() {
  var differences = AKS.Analytics.GoldDatasetSupport.compare(
    { report: { total: 3 } },
    { report: { total: 2 } }
  );
  assertEquals_(1, differences.length);
  assertTrue_(differences[0].indexOf("$.report.total") !== -1, "Le chemin précis doit être indiqué.");
}

function AKS_runAnalyticsGoldDatasetSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — jeux d'or", [
    { name: "ANALYTICS / corpus GOLD-001 à GOLD-010", test: AKS_testAnalyticsGoldDatasets_coverValidatedCorpus_ },
    { name: "ANALYTICS / immutabilité profonde", test: AKS_testAnalyticsGoldDatasets_areDeeplyImmutable_ },
    { name: "ANALYTICS / reproductibilité", test: AKS_testAnalyticsGoldDatasets_areReproducible_ },
    { name: "ANALYTICS / comparaison récursive", test: AKS_testAnalyticsGoldDatasetComparator_reportsPrecisePath_ }
  ]);
}
