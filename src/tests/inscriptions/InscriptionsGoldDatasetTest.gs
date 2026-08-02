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

function AKS_testInscriptionsGold_executesValidatedCatalogue_() {
  var datasets = AKS.Tests.InscriptionsGoldDatasets;
  var engine = AKS.Inscriptions.ReadOnlyEngine;
  var dossier = engine.execute(datasets[0]).output;
  assertEquals_("RECUE", dossier.states.reception);
  assertEquals_("A_EVALUER", dossier.states.verification);
  assertEquals_("NON_PREPARE", dossier.states.preparation);
  assertEquals_("INACTIF", dossier.states.activation);
  assertEquals_("DEPLACEE", engine.execute(datasets[4]).output[1].status);
  assertEquals_("ABSENT", engine.execute(datasets[5]).output[3].decision);
  assertEquals_("RSP-000001", engine.execute(datasets[6]).output.links[2].guardianId);
  assertEquals_(true, engine.execute(datasets[15]).output.restored);
}

function AKS_testInscriptionsGold_allocatesUniqueCanonicalIdentifiers_() {
  var result = AKS.Inscriptions.ReadOnlyEngine.execute(AKS.Tests.InscriptionsGoldDatasets[7]).output;
  var unique = {};
  result.ids.forEach(function (id) { unique[id] = true; });
  assertEquals_(result.ids.length, Object.keys(unique).length, "Les identifiants émis doivent être uniques.");
  assertEquals_("LIC-000002", result.ids[0]);
  assertEquals_("RSP-000001", result.ids[1]);
  assertEquals_("INS-2026-000001", result.ids[2]);
  assertEquals_("IMP-2026-000002", result.ids[3]);
  assertEquals_("IMP-2026-000003", result.ids[4]);
  assertEquals_(
    '["A","B","A","B","A"]',
    JSON.stringify(result.lockOrder),
    "Les demandes concurrentes doivent être sérialisées sous verrou."
  );
}

function AKS_testInscriptionsGold_minimizesQuestionnaireSante_() {
  var dataset = AKS.Tests.InscriptionsGoldDatasets[13];
  assertTrue_(!Object.prototype.hasOwnProperty.call(dataset.input, "medicalAnswers"), "Aucune réponse médicale détaillée ne doit figurer dans la fixture.");
  assertEquals_(false, AKS.Inscriptions.ReadOnlyEngine.execute(dataset).output.medicalAnswersPresent);
}

function AKS_testInscriptionsGold_matchesEveryExecutableOracle_() {
  var report = AKS.Inscriptions.ReadOnlyEngine.run(AKS.Tests.InscriptionsGoldDatasets);
  assertEquals_(0, report.counts.ECHEC);
  assertEquals_(12, report.counts.REUSSI);
  assertEquals_(2, report.counts.PARTIEL);
  assertEquals_(2, report.counts.BLOQUE);
  report.details.forEach(function (detail) { assertEquals_(0, detail.differences.length, detail.id); });
}

function AKS_testInscriptionsGold_factoryContainsNoGoogleService_() {
  // La fabrique contient textuellement toutes les fonctions internes du moteur,
  // contrairement à l'ancien contrôle limité aux deux méthodes publiques.
  var source = String(AKS.Inscriptions.createReadOnlyEngine);
  [
    "SpreadsheetApp", "DriveApp", "FormApp", "MailApp", "GmailApp",
    "PropertiesService", "CacheService", "LockService", "UrlFetchApp",
    "Session.getActiveUser", "Utilities.newBlob"
  ].forEach(function (name) {
    assertTrue_(source.indexOf(name) === -1, name + " ne doit apparaître nulle part dans le moteur.");
  });
  assertTrue_(source.indexOf("function defaultDependencies_") !== -1, "La fabrique inspectée doit inclure les dépendances internes.");
  assertTrue_(source.indexOf("function execute") !== -1, "La fabrique inspectée doit inclure l'exécution publique.");
}

function AKS_runInscriptionsGoldDatasetSuite() {
  return AKS_runNamedTestSuite_("AKS Inscriptions — jeux d'or sans écriture", [
    { name: "INSCRIPTIONS / corpus versionné", test: AKS_testInscriptionsGold_coversVersionedCorpus_ },
    { name: "INSCRIPTIONS / immutabilité profonde", test: AKS_testInscriptionsGold_isDeeplyImmutable_ },
    { name: "INSCRIPTIONS / empreintes vérifiées", test: AKS_testInscriptionsGold_verifiesFingerprints_ },
    { name: "INSCRIPTIONS / catalogue réellement exécuté", test: AKS_testInscriptionsGold_executesValidatedCatalogue_ },
    { name: "INSCRIPTIONS / identifiants canoniques uniques", test: AKS_testInscriptionsGold_allocatesUniqueCanonicalIdentifiers_ },
    { name: "INSCRIPTIONS / Questionnaire santé minimisé", test: AKS_testInscriptionsGold_minimizesQuestionnaireSante_ },
    { name: "INSCRIPTIONS / conformité des oracles et statuts", test: AKS_testInscriptionsGold_matchesEveryExecutableOracle_ },
    { name: "INSCRIPTIONS / fabrique sans API Google", test: AKS_testInscriptionsGold_factoryContainsNoGoogleService_ }
  ]);
}
