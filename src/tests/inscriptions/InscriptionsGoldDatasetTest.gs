function AKS_testInscriptionsGold_coversVersionedCorpus_() {
  var datasets = AKS.Tests.InscriptionsGoldDatasets;
  assertEquals_(16, datasets.length, "Le corpus doit contenir seize jeux d'or.");
  assertEquals_(0, AKS.Inscriptions.GoldSupport.validate(datasets).length);
}

function AKS_testInscriptionsGold_isDeeplyImmutable_() {
  var datasets = AKS.Tests.InscriptionsGoldDatasets;
  assertTrue_(Object.isFrozen(datasets), "La collection doit être immuable.");
  datasets.forEach(function (dataset) {
    assertTrue_(Object.isFrozen(dataset), dataset.id + " doit être immuable.");
    assertTrue_(Object.isFrozen(dataset.input), dataset.id + ".input doit être immuable.");
    assertTrue_(Object.isFrozen(dataset.expected), dataset.id + ".expected doit être immuable.");
  });
}

function AKS_testInscriptionsGold_verifiesFingerprints_() {
  var tampered = JSON.parse(JSON.stringify(AKS.Tests.InscriptionsGoldDatasets));
  tampered[0].input.row.Nom = "Valeur altérée";
  var errors = AKS.Inscriptions.GoldSupport.validate(tampered);
  assertTrue_(errors.some(function (error) { return error.indexOf("empreinte invalide") !== -1; }));
}

function AKS_testInscriptionsGold_distinguishesMissingNoAndInvalid_() {
  var result = AKS.Inscriptions.ReadOnlyEngine.execute(AKS.Tests.InscriptionsGoldDatasets[3]);
  assertEquals_("ABSENT", result.output[0]);
  assertEquals_("NON", result.output[2]);
  assertEquals_("INVALIDE", result.output[4]);
}

function AKS_testInscriptionsGold_usesCanonicalIdentifiers_() {
  var result = AKS.Inscriptions.ReadOnlyEngine.execute(AKS.Tests.InscriptionsGoldDatasets[7]);
  assertEquals_("LIC-000001", result.output.ids[0]);
  assertEquals_("RSP-000001", result.output.ids[1]);
  assertEquals_("INS-2026-000001", result.output.ids[2]);
  assertEquals_("IMP-2026-000001", result.output.ids[3]);
}

function AKS_testInscriptionsGold_matchesEveryExecutableOracle_() {
  var report = AKS.Inscriptions.ReadOnlyEngine.run(AKS.Tests.InscriptionsGoldDatasets);
  assertEquals_(0, report.counts.ECHEC);
  report.details.forEach(function (detail) { assertEquals_(0, detail.differences.length, detail.id); });
}

function AKS_testInscriptionsGold_reportsPartialAndBlockedHonestly_() {
  var report = AKS.Inscriptions.ReadOnlyEngine.run(AKS.Tests.InscriptionsGoldDatasets);
  assertEquals_(12, report.counts.REUSSI);
  assertEquals_(2, report.counts.PARTIEL);
  assertEquals_(2, report.counts.BLOQUE);
}

function AKS_testInscriptionsGold_callsNoGoogleService_() {
  var source = String(AKS.Inscriptions.ReadOnlyEngine.execute) + String(AKS.Inscriptions.ReadOnlyEngine.run);
  ["SpreadsheetApp", "DriveApp", "FormApp", "MailApp", "GmailApp", "PropertiesService", "CacheService"].forEach(function (name) {
    assertTrue_(source.indexOf(name) === -1, name + " ne doit pas être appelé.");
  });
}

function AKS_runInscriptionsGoldDatasetSuite() {
  return AKS_runNamedTestSuite_("AKS Inscriptions — jeux d'or sans écriture", [
    { name: "INSCRIPTIONS / corpus versionné", test: AKS_testInscriptionsGold_coversVersionedCorpus_ },
    { name: "INSCRIPTIONS / immutabilité profonde", test: AKS_testInscriptionsGold_isDeeplyImmutable_ },
    { name: "INSCRIPTIONS / empreintes vérifiées", test: AKS_testInscriptionsGold_verifiesFingerprints_ },
    { name: "INSCRIPTIONS / absence distincte", test: AKS_testInscriptionsGold_distinguishesMissingNoAndInvalid_ },
    { name: "INSCRIPTIONS / identifiants canoniques", test: AKS_testInscriptionsGold_usesCanonicalIdentifiers_ },
    { name: "INSCRIPTIONS / conformité des oracles", test: AKS_testInscriptionsGold_matchesEveryExecutableOracle_ },
    { name: "INSCRIPTIONS / statuts honnêtes", test: AKS_testInscriptionsGold_reportsPartialAndBlockedHonestly_ },
    { name: "INSCRIPTIONS / aucune API Google", test: AKS_testInscriptionsGold_callsNoGoogleService_ }
  ]);
}
