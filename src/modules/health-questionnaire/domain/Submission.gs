var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Creates the immutable administrative record persisted after evaluation.
 * Detailed questionnaire answers must never be passed to this object.
 *
 * @param {Object} data
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.Submission = function (data) {
  validateRequired_(
    data,
    "HEALTH_SUBMISSION_REQUIRED",
    "Submission data is required."
  );

  ["answers", "answersJson", "responses", "responsesJson"].forEach(
    function (forbiddenField) {
      if (Object.prototype.hasOwnProperty.call(data, forbiddenField)) {
        throw new AKS.Core.Exception(
          "HEALTH_SUBMISSION_ANSWERS_FORBIDDEN",
          "Detailed answers must not be persisted in a submission."
        );
      }
    }
  );

  var id = requireText_(data.id, "Submission id");
  var campaignId = requireText_(data.campaignId, "Campaign id");
  var questionnaireId = requireText_(
    data.questionnaireId,
    "Questionnaire id"
  );
  var questionnaireVersion = requireText_(
    data.questionnaireVersion,
    "Questionnaire version"
  );
  var email = requireEmail_(data.email);
  var lastName = requireText_(data.lastName, "Last name");
  var firstName = requireText_(data.firstName, "First name");
  var birthDate = normalizeDate_(data.birthDate);
  var submittedAt = normalizeDate_(data.submittedAt) || new Date();
  var ageAtSubmission = calculateAge_(birthDate, submittedAt);

  if (ageAtSubmission < 0 || ageAtSubmission >= 18) {
    throw new AKS.Core.Exception(
      "HEALTH_SUBMISSION_MINOR_REQUIRED",
      "The health questionnaire is reserved for minors."
    );
  }

  var sex = requireText_(data.sex, "Sex").toUpperCase();
  if (["FEMALE", "MALE"].indexOf(sex) === -1) {
    throw new AKS.Core.Exception(
      "HEALTH_SUBMISSION_SEX_INVALID",
      "Sex must be FEMALE or MALE."
    );
  }

  var result = requireText_(data.result, "Result").toUpperCase();
  var allowedResults = [
    "NO_MEDICAL_CERTIFICATE_REQUIRED",
    "MEDICAL_CERTIFICATE_REQUIRED"
  ];

  if (allowedResults.indexOf(result) === -1) {
    throw new AKS.Core.Exception(
      "HEALTH_SUBMISSION_RESULT_INVALID",
      "Invalid administrative result."
    );
  }

  var status = requireText_(data.status || "CREATED", "Status").toUpperCase();
  var allowedStatuses = [
    "CREATED",
    "PDF_GENERATED",
    "EMAIL_SENT",
    "COMPLETED"
  ];

  if (allowedStatuses.indexOf(status) === -1) {
    throw new AKS.Core.Exception(
      "HEALTH_SUBMISSION_STATUS_INVALID",
      "Invalid submission status."
    );
  }

  var processingVersion = requireText_(
    data.processingVersion,
    "Processing version"
  );

  return Object.freeze({
    id: id,
    campaignId: campaignId,
    questionnaireId: questionnaireId,
    questionnaireVersion: questionnaireVersion,
    email: email,
    lastName: lastName,
    firstName: firstName,
    birthDate: birthDate,
    ageAtSubmission: ageAtSubmission,
    sex: sex,
    legalRepresentativeLastName: requireText_(
      data.legalRepresentativeLastName,
      "Legal representative last name"
    ),
    legalRepresentativeFirstName: requireText_(
      data.legalRepresentativeFirstName,
      "Legal representative first name"
    ),
    result: result,
    status: status,
    processingVersion: processingVersion,
    submittedAt: submittedAt,
    respondentEmailSentAt:
      normalizeDate_(data.respondentEmailSentAt) || null,
    clubEmailSentAt: normalizeDate_(data.clubEmailSentAt) || null,
    attestationFileId: optionalText_(data.attestationFileId),
    attestationFileUrl: optionalText_(data.attestationFileUrl)
  });
};

function requireEmail_(value) {
  var email = requireText_(value, "Email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AKS.Core.Exception(
      "HEALTH_SUBMISSION_EMAIL_INVALID",
      "Invalid email address."
    );
  }

  return email;
}

function optionalText_(value) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }

  return String(value).trim() || null;
}

function calculateAge_(birthDate, referenceDate) {
  if (!birthDate) {
    throw new AKS.Core.Exception(
      "HEALTH_SUBMISSION_BIRTH_DATE_REQUIRED",
      "Birth date is required."
    );
  }

  var age = referenceDate.getFullYear() - birthDate.getFullYear();
  var monthDifference =
    referenceDate.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      referenceDate.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}
