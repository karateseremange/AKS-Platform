function test_HQ007_eligibleRespondentReceivesPdfAndClubDoesNot() {
  var fixture = createHQ007Fixture_();
  var completed = fixture.service.notify(
    createHQ007Submission_("NO_MEDICAL_CERTIFICATE_REQUIRED"),
    createHQ007AnswerSummary_("Non")
  );

  assertEquals_(2, fixture.messages.length);
  assertEquals_("parent@example.org", fixture.messages[0].to);
  assertEquals_("drive-file-1", fixture.messages[0].attachmentFileId);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "Madame, Monsieur"
  ) !== -1);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "à la dater, à la signer et à la transmettre"
  ) !== -1);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "Aucune réponse apportée au questionnaire"
  ) !== -1);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "Avez-vous ressenti une douleur inhabituelle ?"
  ) !== -1);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "Réponse : Non"
  ) !== -1);
  assertEquals_("contact@karate-seremange.fr", fixture.messages[1].to);
  assertTrue_(!fixture.messages[1].attachmentFileId);
  assertEquals_("COMPLETED", completed.status);
}

function test_HQ007_certificateRequiredHasNoAttachment() {
  var fixture = createHQ007Fixture_();
  fixture.service.notify(
    createHQ007Submission_("MEDICAL_CERTIFICATE_REQUIRED"),
    createHQ007AnswerSummary_("Oui")
  );

  assertEquals_(2, fixture.messages.length);
  assertTrue_(!fixture.messages[0].attachmentFileId);
  assertTrue_(!fixture.messages[1].attachmentFileId);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "un certificat médical devra être transmis"
  ) !== -1);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "Aucune réponse apportée au questionnaire"
  ) !== -1);
  assertTrue_(fixture.messages[0].textBody.indexOf(
    "Réponse : Oui"
  ) !== -1);
}

function test_HQ007_clubReceivesAdministrativeIdentityAndFormalityOnly() {
  var fixture = createHQ007Fixture_();
  fixture.service.notify(
    createHQ007Submission_("NO_MEDICAL_CERTIFICATE_REQUIRED"),
    createHQ007AnswerSummary_("Non")
  );
  var clubMessage = fixture.messages[1];
  var serialized = JSON.stringify(clubMessage);

  assertTrue_(serialized.indexOf("QS-2026-000001") !== -1);
  assertTrue_(serialized.indexOf("Alice DUPONT") !== -1);
  assertTrue_(serialized.indexOf("12/05/2014") !== -1);
  assertTrue_(serialized.indexOf("Aucun certificat médical requis") !== -1);
  assertTrue_(serialized.indexOf("Marie") === -1);
  assertTrue_(serialized.indexOf("parent@example.org") === -1);
  assertTrue_(serialized.indexOf("NO_MEDICAL_CERTIFICATE_REQUIRED") === -1);
  assertTrue_(serialized.indexOf("drive-file") === -1);
  assertTrue_(serialized.indexOf("douleur inhabituelle") === -1);
  assertTrue_(serialized.indexOf("Réponse :") === -1);
}

function test_HQ007_persistsEachSuccessfulDelivery() {
  var fixture = createHQ007Fixture_();
  var completed = fixture.service.notify(
    createHQ007Submission_("MEDICAL_CERTIFICATE_REQUIRED"),
    createHQ007AnswerSummary_("Oui")
  );
  var stored = fixture.repository.findSubmissionById(completed.id);

  assertTrue_(stored.respondentEmailSentAt instanceof Date);
  assertTrue_(stored.clubEmailSentAt instanceof Date);
  assertEquals_("COMPLETED", stored.status);
  assertTrue_(JSON.stringify(stored).indexOf(
    "douleur inhabituelle"
  ) === -1);
  assertTrue_(!Object.prototype.hasOwnProperty.call(
    stored,
    "answerSummary"
  ));
}

function test_HQ007_retrySkipsAlreadySentRespondentEmail() {
  var fixture = createHQ007Fixture_(2);
  var submission = createHQ007Submission_(
    "MEDICAL_CERTIFICATE_REQUIRED"
  );

  assertThrows_(function () {
    fixture.service.notify(
      submission,
      createHQ007AnswerSummary_("Oui")
    );
  }, "HEALTH_EMAIL_TEST_FAILURE");

  var stored = fixture.repository.findSubmissionById(submission.id);
  assertTrue_(stored.respondentEmailSentAt instanceof Date);
  assertEquals_(null, stored.clubEmailSentAt);

  fixture.failAt = null;
  fixture.service.notify(stored);
  assertEquals_(3, fixture.messages.length);
  assertEquals_("contact@karate-seremange.fr", fixture.messages[2].to);
}

function test_HQ007_rejectsDetailedAnswers() {
  var fixture = createHQ007Fixture_();
  var submission = createHQ007Submission_(
    "MEDICAL_CERTIFICATE_REQUIRED"
  );
  var unsafe = {};

  Object.keys(submission).forEach(function (key) {
    unsafe[key] = submission[key];
  });
  unsafe.answers = { Q1: "YES" };

  assertThrows_(function () {
    fixture.service.notify(unsafe);
  }, "HEALTH_NOTIFICATION_ANSWERS_FORBIDDEN");
}

function test_HQ007_gatewayLoadsAttachmentOnlyWhenRequested() {
  var sent = {};
  var attachmentLoads = 0;
  var gateway = AKS.Modules.HealthQuestionnaire
    .HealthQuestionnaireEmailGateway({
      sender: function (to, subject, textBody, options) {
        sent = { to: to, subject: subject, options: options };
      },
      attachmentProvider: function (fileId) {
        attachmentLoads += 1;
        return { fileId: fileId };
      }
    });

  gateway.send({
    to: "parent@example.org",
    from: "contact@karate-seremange.fr",
    senderName: "Association Karaté Serémange",
    subject: "Test",
    textBody: "Test",
    htmlBody: "<p>Test</p>",
    attachmentFileId: "drive-file-1"
  });

  assertEquals_(1, attachmentLoads);
  assertEquals_("drive-file-1", sent.options.attachments[0].fileId);
  assertEquals_("contact@karate-seremange.fr", sent.options.from);
}

function createHQ007Fixture_(failAt) {
  var repository =
    AKS.Modules.HealthQuestionnaire.HealthQuestionnaireInMemoryRepository();
  var fixture = {
    repository: repository,
    messages: [],
    failAt: failAt || null
  };
  var gateway = {
    send: function (message) {
      fixture.messages.push(message);
      if (fixture.failAt === fixture.messages.length) {
        throw new AKS.Core.Exception(
          "HEALTH_EMAIL_TEST_FAILURE",
          "Simulated e-mail failure."
        );
      }
    }
  };
  var tick = 0;

  fixture.service = AKS.Modules.HealthQuestionnaire
    .HealthQuestionnaireNotificationService(
      repository,
      gateway,
      {
        clubEmail: "contact@karate-seremange.fr",
        senderName: "Association Karaté Serémange"
      },
      function () {
        tick += 1;
        return new Date("2026-07-12T12:00:0" + tick + "Z");
      }
    );
  return fixture;
}

function createHQ007Submission_(result) {
  return AKS.Modules.HealthQuestionnaire.Submission({
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
    result: result,
    status: result === "NO_MEDICAL_CERTIFICATE_REQUIRED"
      ? "PDF_GENERATED"
      : "CREATED",
    processingVersion: "hq-007",
    submittedAt: new Date("2026-07-12T10:00:00Z"),
    attestationFileId: result === "NO_MEDICAL_CERTIFICATE_REQUIRED"
      ? "drive-file-1"
      : null,
    attestationFileUrl: result === "NO_MEDICAL_CERTIFICATE_REQUIRED"
      ? "https://drive.example/file-1"
      : null
  });
}

function createHQ007AnswerSummary_(firstAnswer) {
  return [
    {
      question: "Avez-vous ressenti une douleur inhabituelle ?",
      answer: firstAnswer
    },
    {
      question: "Avez-vous eu un malaise ?",
      answer: "Non"
    }
  ];
}
