function test_HQ0052_S43_submissionIdStartsAtOne() {
  var fixture = createHQ0052S43Fixture_();
  var result = fixture.controller.submitQuestionnaire(
    createHQ0052S43Payload_("NO")
  );

  assertTrue_(result.ok);
  assertEquals_("QS-2026-000001", result.data.submissionId);
}

function test_HQ0052_S43_submissionIdIncrements() {
  var fixture = createHQ0052S43Fixture_();
  var first = fixture.controller.submitQuestionnaire(
    createHQ0052S43Payload_("NO")
  );
  var second = fixture.controller.submitQuestionnaire(
    createHQ0052S43Payload_("YES")
  );

  assertEquals_("QS-2026-000001", first.data.submissionId);
  assertEquals_("QS-2026-000002", second.data.submissionId);
}

function test_HQ0052_S43_allNoStoresAdministrativeResultOnly() {
  var fixture = createHQ0052S43Fixture_();
  var result = fixture.controller.submitQuestionnaire(
    createHQ0052S43Payload_("NO")
  );
  var stored = fixture.repository.findSubmissionById(result.data.submissionId);

  assertEquals_("NO_MEDICAL_CERTIFICATE_REQUIRED", stored.result);
  assertEquals_("1.0.0", stored.questionnaireVersion);
  assertEquals_("CREATED", stored.status);
  assertTrue_(!Object.prototype.hasOwnProperty.call(stored, "answers"));
  assertTrue_(!Object.prototype.hasOwnProperty.call(stored, "responses"));
}

function test_HQ0052_S43_yesStoresCertificateRequired() {
  var fixture = createHQ0052S43Fixture_();
  var result = fixture.controller.submitQuestionnaire(
    createHQ0052S43Payload_("YES")
  );

  assertEquals_("MEDICAL_CERTIFICATE_REQUIRED", result.data.result);
}

function test_HQ0052_S43_confirmationDtoIsWebSerializable() {
  var fixture = createHQ0052S43Fixture_();
  var result = fixture.controller.submitQuestionnaire(
    createHQ0052S43Payload_("NO")
  );

  assertEquals_("string", typeof result.data.submissionId);
  assertEquals_("string", typeof result.data.result);
  assertEquals_("string", typeof result.data.status);
  assertEquals_("string", typeof result.data.submittedAt);
  assertTrue_(!isNaN(Date.parse(result.data.submittedAt)));
}

function test_HQ0052_S43_rejectsUnconfirmedDeclaration() {
  var fixture = createHQ0052S43Fixture_();
  var payload = createHQ0052S43Payload_("NO");
  payload.declaration.accepted = false;
  var result = fixture.controller.submitQuestionnaire(payload);

  assertTrue_(!result.ok);
  assertEquals_("HEALTH_DECLARATION_INVALID", result.error.code);
  assertEquals_(0, fixture.repository.listSubmissionsByCampaign("CAMPAIGN-WEB-1").length);
}

function test_HQ0052_S43_submissionHeadersContainNoAnswerColumns() {
  var source = AKS.Modules.HealthQuestionnaire.Submission(
    createHQ0052S43SubmissionData_()
  );
  ["answers", "answersJson", "responses", "responsesJson"].forEach(
    function (field) {
      assertTrue_(!Object.prototype.hasOwnProperty.call(source, field));
    }
  );
}

function createHQ0052S43Fixture_() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");
  return fixture;
}

function createHQ0052S43Payload_(answer) {
  return {
    identity: {
      email: "parent@example.org",
      lastName: "DUPONT",
      firstName: "Alice",
      birthDate: "2014-05-12",
      sex: "FEMALE",
      legalRepresentativeLastName: "DUPONT",
      legalRepresentativeFirstName: "Marie"
    },
    answers: { Q1: answer, Q2: "NO" },
    declaration: {
      legalRepresentativeName: "Marie DUPONT",
      accepted: true
    }
  };
}

function createHQ0052S43SubmissionData_() {
  return {
    id: "QS-2026-000001",
    campaignId: "CAMPAIGN-WEB-1",
    questionnaireId: "QUESTIONNAIRE-WEB-1",
    questionnaireVersion: "1.0.0",
    email: "parent@example.org",
    lastName: "DUPONT",
    firstName: "Alice",
    birthDate: "2014-05-12",
    sex: "FEMALE",
    legalRepresentativeLastName: "DUPONT",
    legalRepresentativeFirstName: "Marie",
    result: "NO_MEDICAL_CERTIFICATE_REQUIRED",
    status: "CREATED",
    processingVersion: "0.5.1",
    submittedAt: new Date("2026-07-12T10:00:00Z")
  };
}
