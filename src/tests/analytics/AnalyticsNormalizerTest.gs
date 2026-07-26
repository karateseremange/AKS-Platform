function AKS_testAnalyticsNormalizer_exposesCanonicalModel_() {
  var model = AKS.Analytics.NormalizedModel;
  assertEquals_("1.0", model.SCHEMA_VERSION);
  assertEquals_("NON_RENSEIGNE", model.ATTENDANCE_STATUS.NON_RENSEIGNE);
  assertTrue_(Object.isFrozen(model), "Le modèle canonique doit être immuable.");
}

function AKS_testAnalyticsNormalizer_normalizesLegacyStatuses_() {
  var normalizer = AKS.Analytics.Normalizer;
  var actual = ["P", "A", "E", ""].map(function (value) {
    return normalizer.normalizeAttendanceStatus(value).value;
  });
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(
    ["PRESENT", "ABSENT", "EXCUSE", "NON_RENSEIGNE"], actual
  ).length);
}

function AKS_testAnalyticsNormalizer_rejectsUnknownStatus_() {
  var result = AKS.Analytics.Normalizer.normalizeAttendanceStatus("?");
  assertEquals_(null, result.value);
  assertEquals_("STATUT_PRESENCE_INCONNU", result.errors[0]);
}

function AKS_testAnalyticsNormalizer_appliesTemporalEligibility_() {
  var normalize = AKS.Analytics.Normalizer.normalizeEligibility;
  assertEquals_("NON_ELIGIBLE", normalize("2026-09-30", "2026-10-01", "2027-03-31").value);
  assertEquals_("ELIGIBLE", normalize("2026-10-01", "2026-10-01", "2027-03-31").value);
  assertEquals_("NON_ELIGIBLE", normalize("2027-04-01", "2026-10-01", "2027-03-31").value);
}

function AKS_testAnalyticsNormalizer_validatesMemberIdentifiers_() {
  var optional = AKS.Analytics.Normalizer.normalizeMember({ licencie_id: "LIC-000007" });
  assertEquals_(0, optional.errors.length);
  assertEquals_("NUMERO_LICENCE_ABSENT", optional.warnings[0]);

  var invalid = AKS.Analytics.Normalizer.normalizeMember({
    licencie_id: "7",
    numero_licence: "ABC"
  });
  assertEquals_(2, invalid.errors.length);
}

function AKS_testAnalyticsNormalizer_excludesNonPerformedSessions_() {
  var result = AKS.Analytics.Normalizer.normalizeSession({ status: "ANNULEE" });
  assertEquals_(false, result.value.included);
  assertEquals_("SEANCE_NON_REALISEE", result.exclusions[0]);
}

function AKS_testAnalyticsNormalizer_excludesHistoricalWomensCourse_() {
  var result = AKS.Analytics.Normalizer.normalizeCourse({
    season: "2025-2026",
    code: "FEMININ"
  });
  assertEquals_(null, result.value);
  assertEquals_("FEMININ_HORS_PERIMETRE_HISTORIQUE", result.exclusions[0]);
}

function AKS_testAnalyticsNormalizer_rejectsUnknownSchema_() {
  var result = AKS.Analytics.Normalizer.validateSchemaVersion("99.0");
  assertEquals_(null, result.value);
  assertEquals_("VERSION_SCHEMA_INCONNUE", result.errors[0]);
}

function AKS_testAnalyticsNormalizer_isPureAndDeterministic_() {
  var input = { licencie_id: "LIC-000007", numero_licence: "12345678" };
  var before = JSON.stringify(input);
  var first = AKS.Analytics.Normalizer.normalizeMember(input);
  var second = AKS.Analytics.Normalizer.normalizeMember(input);
  assertEquals_(before, JSON.stringify(input));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first), "Le résultat doit être immuable.");
}

function AKS_testAnalyticsNormalizer_matchesGoldDatasets_() {
  var datasets = AKS.Tests.AnalyticsGoldDatasets;
  var gold2 = datasets[1];
  var gold3 = datasets[2];
  var gold4 = datasets[3];
  var gold7 = datasets[6];
  var gold8 = datasets[7];
  var gold9 = datasets[8];
  var normalize = AKS.Analytics.Normalizer;
  var eligibility = {};

  gold2.input.checkDates.forEach(function (date, index) {
    eligibility[gold2.input.checkNames[index]] = normalize.normalizeEligibility(
      date, gold2.input.entryDate, gold2.input.exitDate
    ).value;
  });
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(gold2.expected.eligibility, eligibility).length);

  var statuses = gold3.input.legacyValues.map(function (value) {
    return normalize.normalizeAttendanceStatus(value).value;
  });
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(gold3.expected.normalized, statuses).length);

  var sessions = gold4.input.sessions.map(normalize.normalizeSession);
  assertEquals_(gold4.expected.includedSessions, sessions.filter(function (item) {
    return item.value.included;
  }).length);
  assertEquals_(gold4.expected.excludedSessions, sessions.filter(function (item) {
    return item.exclusions.length > 0;
  }).length);

  var members = gold7.input.members.map(normalize.normalizeMember);
  assertEquals_(gold7.expected.acceptedMembers, members.filter(function (item) {
    return item.errors.length === 0;
  }).length);
  assertEquals_(gold7.expected.warnings[0], members[0].warnings[0]);

  var courses = gold8.input.courses.map(normalize.normalizeCourse);
  assertEquals_(gold8.expected.includedCourses[0], courses[0].value.code);
  assertEquals_(gold8.expected.exclusions[0], courses[1].exclusions[0]);

  assertEquals_(gold9.expected.acceptedVersion, normalize.validateSchemaVersion(
    gold9.input.supportedVersion
  ).value);
  assertEquals_(gold9.expected.rejectedVersionError, normalize.validateSchemaVersion(
    gold9.input.receivedVersion
  ).errors[0]);
}

function AKS_runAnalyticsNormalizerSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — normalisation", [
    { name: "ANALYTICS / modèle canonique", test: AKS_testAnalyticsNormalizer_exposesCanonicalModel_ },
    { name: "ANALYTICS / statuts historiques", test: AKS_testAnalyticsNormalizer_normalizesLegacyStatuses_ },
    { name: "ANALYTICS / statut inconnu", test: AKS_testAnalyticsNormalizer_rejectsUnknownStatus_ },
    { name: "ANALYTICS / éligibilité temporelle", test: AKS_testAnalyticsNormalizer_appliesTemporalEligibility_ },
    { name: "ANALYTICS / identifiants licencié", test: AKS_testAnalyticsNormalizer_validatesMemberIdentifiers_ },
    { name: "ANALYTICS / séance non réalisée", test: AKS_testAnalyticsNormalizer_excludesNonPerformedSessions_ },
    { name: "ANALYTICS / cours féminin historique", test: AKS_testAnalyticsNormalizer_excludesHistoricalWomensCourse_ },
    { name: "ANALYTICS / version de schéma", test: AKS_testAnalyticsNormalizer_rejectsUnknownSchema_ },
    { name: "ANALYTICS / pureté et déterminisme", test: AKS_testAnalyticsNormalizer_isPureAndDeterministic_ },
    { name: "ANALYTICS / conformité jeux d'or", test: AKS_testAnalyticsNormalizer_matchesGoldDatasets_ }
  ]);
}
