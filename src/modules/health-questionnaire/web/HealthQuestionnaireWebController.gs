var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Read-only controller for the public questionnaire Web App.
 *
 * It exposes presentation data only. The HTML never accesses repositories,
 * settings or domain objects directly.
 *
 * @param {Object} repository
 * @param {Object} settings
 * @param {Object=} attestationService
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireWebController =
  function (repository, settings, attestationService) {
    AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(repository);

    if (!settings || typeof settings.getActiveCampaignId !== "function") {
      throw new AKS.Core.Exception(
        "HEALTH_WEB_SETTINGS_INVALID",
        "Health questionnaire settings are required."
      );
    }

    function getPublicViewModel() {
      var activeCampaignId = settings.getActiveCampaignId();

      if (!activeCampaignId) {
        return AKS.Core.Result.failure(
          "HEALTH_ACTIVE_CAMPAIGN_NOT_CONFIGURED",
          "Aucune campagne de questionnaire santé n'est actuellement disponible."
        );
      }

      var campaign = repository.findCampaignById(activeCampaignId);

      if (!campaign) {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_NOT_FOUND",
          "La campagne active est introuvable."
        );
      }

      if (campaign.status !== "OPEN") {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_NOT_OPEN",
          "La campagne de questionnaire santé n'est pas ouverte."
        );
      }

      var questionnaire = repository.findQuestionnaireById(
        campaign.questionnaireId
      );

      if (!questionnaire) {
        return AKS.Core.Result.failure(
          "HEALTH_QUESTIONNAIRE_NOT_FOUND",
          "Le questionnaire associé à la campagne est introuvable."
        );
      }

      var flow = [
        Object.freeze({
          id: "identity",
          label: "Identité",
          title: "Informations du mineur"
        }),
        Object.freeze({
          id: "questions",
          label: "Questionnaire santé",
          title: questionnaire.title
        }),
        Object.freeze({
          id: "declaration",
          label: "Déclaration",
          title: "Déclaration sur l’honneur"
        }),
        Object.freeze({
          id: "confirmation",
          label: "Confirmation",
          title: "Questionnaire enregistré"
        })
      ];

      return AKS.Core.Result.success(
        Object.freeze({
          available: true,
          brand: Object.freeze({
            clubName: "Association Karaté Serémange",
            primaryColor: "#2a4b9b"
          }),
          presentation: Object.freeze({
            officialLabel: "Questionnaire officiel",
            estimatedDuration: "2 minutes",
            confidentialityMessage:
              "Les réponses ne sont ni conservées par AKS Platform, ni communiquées au club."
          }),
          campaign: Object.freeze({
            name: campaign.name,
            season: campaign.season
          }),
          questionnaire: createQuestionnaireViewModel_(questionnaire),
          flow: Object.freeze(flow),
          steps: Object.freeze({
            current: 1,
            total: flow.length
          })
        })
      );
    }


    function createQuestionnaireViewModel_(questionnaire) {
      var regulation =
        AKS.Modules.HealthQuestionnaire.MinorQuestionnaire2021;
      var questionsByCategory = Object.create(null);

      questionnaire.questions.forEach(function (question) {
        var category = question.category || "UNCLASSIFIED";
        if (!questionsByCategory[category]) {
          questionsByCategory[category] = [];
        }
        questionsByCategory[category].push(Object.freeze({
          id: question.id,
          label: question.label,
          order: question.order,
          required: question.required !== false,
          category: category
        }));
      });

      var sections = regulation.sections.map(function (section) {
        return Object.freeze({
          id: section.id,
          title: section.title,
          order: section.order,
          questions: Object.freeze(
            (questionsByCategory[section.id] || []).slice()
          )
        });
      });

      return Object.freeze({
        title: questionnaire.title,
        source: questionnaire.source || regulation.source,
        reference: regulation.reference,
        article: regulation.article,
        officialTitle: regulation.title,
        version: regulation.version,
        effectiveFrom: regulation.effectiveFrom,
        parentWarning: regulation.parentWarning,
        childIntroduction: regulation.childIntroduction,
        positiveAnswerInstruction: regulation.positiveAnswerInstruction,
        questions: Object.freeze(
          questionnaire.questions.map(function (question) {
            return Object.freeze({
              id: question.id,
              label: question.label,
              order: question.order,
              required: question.required !== false,
              category: question.category || null
            });
          })
        ),
        sections: Object.freeze(sections)
      });
    }

    function parseBirthDate_(birthDate) {
      if (birthDate instanceof Date) {
        return new Date(
          birthDate.getFullYear(),
          birthDate.getMonth(),
          birthDate.getDate()
        );
      }

      var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        String(birthDate || "")
      );
      if (!match) {
        return null;
      }

      var parsed = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );

      if (
        parsed.getFullYear() !== Number(match[1]) ||
        parsed.getMonth() !== Number(match[2]) - 1 ||
        parsed.getDate() !== Number(match[3])
      ) {
        return null;
      }

      return parsed;
    }

    function calculateAgeAt_(birthDate, referenceDate) {
      var birth = parseBirthDate_(birthDate);
      var reference = referenceDate instanceof Date ? referenceDate : new Date();

      if (!birth || isNaN(reference.getTime()) || birth > reference) {
        return null;
      }

      var age = reference.getFullYear() - birth.getFullYear();
      var beforeBirthday =
        reference.getMonth() < birth.getMonth() ||
        (reference.getMonth() === birth.getMonth() &&
          reference.getDate() < birth.getDate());

      return beforeBirthday ? age - 1 : age;
    }

    function validateIdentity(identity, referenceDate) {
      var data = identity || {};
      var errors = {};
      var email = String(data.email || "").trim();
      var nameFields = [
        "lastName",
        "firstName",
        "legalRepresentativeLastName",
        "legalRepresentativeFirstName"
      ];

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "Veuillez saisir une adresse e-mail valide.";
      }

      nameFields.forEach(function (fieldName) {
        if (String(data[fieldName] || "").trim().length < 2) {
          errors[fieldName] = "Veuillez saisir au moins 2 caractères.";
        }
      });

      var age = calculateAgeAt_(data.birthDate, referenceDate);
      if (age === null || age < 0) {
        errors.birthDate = "Veuillez saisir une date de naissance valide.";
      } else if (age >= 18) {
        errors.birthDate =
          "Ce questionnaire est réservé aux sportifs mineurs.";
      }

      if (data.sex !== "FEMALE" && data.sex !== "MALE") {
        errors.sex = "Veuillez sélectionner le sexe du mineur.";
      }

      if (Object.keys(errors).length > 0) {
        return AKS.Core.Result.failure(
          "HEALTH_IDENTITY_INVALID",
          "Les informations d'identité sont incomplètes ou invalides.",
          errors
        );
      }

      return AKS.Core.Result.success(Object.freeze({
        email: email,
        lastName: String(data.lastName).trim(),
        firstName: String(data.firstName).trim(),
        birthDate: data.birthDate,
        age: age,
        sex: data.sex,
        legalRepresentativeLastName:
          String(data.legalRepresentativeLastName).trim(),
        legalRepresentativeFirstName:
          String(data.legalRepresentativeFirstName).trim()
      }));
    }

    function validateAnswers(questionnaire, answers) {
      var source = questionnaire || {};
      var questions = Array.isArray(source.questions) ? source.questions : [];
      var provided = answers || {};
      var missingQuestionIds = [];
      var normalized = {};

      questions.forEach(function (question) {
        var questionId = String(question.id || "");
        var answer = provided[questionId];
        var required = question.required !== false;

        if (answer === "YES" || answer === "NO") {
          normalized[questionId] = answer;
        } else if (required) {
          missingQuestionIds.push(questionId);
        }
      });

      if (missingQuestionIds.length > 0) {
        return AKS.Core.Result.failure(
          "HEALTH_ANSWERS_INCOMPLETE",
          "Veuillez répondre à toutes les questions avant de continuer.",
          Object.freeze({
            missingQuestionIds: Object.freeze(missingQuestionIds.slice())
          })
        );
      }

      return AKS.Core.Result.success(Object.freeze(normalized));
    }


    function getActiveQuestionnaire_() {
      var activeCampaignId = settings.getActiveCampaignId();
      var campaign;
      var questionnaire;

      if (!activeCampaignId) {
        return AKS.Core.Result.failure(
          "HEALTH_ACTIVE_CAMPAIGN_NOT_CONFIGURED",
          "Aucune campagne de questionnaire santé n'est actuellement disponible."
        );
      }

      campaign = repository.findCampaignById(activeCampaignId);
      if (!campaign || campaign.status !== "OPEN") {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_NOT_OPEN",
          "La campagne de questionnaire santé n'est pas ouverte."
        );
      }

      questionnaire = repository.findQuestionnaireById(
        campaign.questionnaireId
      );
      if (!questionnaire) {
        return AKS.Core.Result.failure(
          "HEALTH_QUESTIONNAIRE_NOT_FOUND",
          "Le questionnaire associé à la campagne est introuvable."
        );
      }

      return AKS.Core.Result.success(questionnaire);
    }

    function prepareDeclaration(answers) {
      var questionnaireResult = getActiveQuestionnaire_();
      var answersResult;
      var decision;

      if (!questionnaireResult.ok) {
        return questionnaireResult;
      }

      answersResult = validateAnswers(
        questionnaireResult.data,
        answers
      );
      if (!answersResult.ok) {
        return answersResult;
      }

      decision = AKS.Modules.HealthQuestionnaire.Services
        .HealthQuestionnaireDecisionEngine.evaluate(answersResult.data);

      return AKS.Core.Result.success(Object.freeze({
        result: decision.result,
        generatedAt: decision.generatedAt.toISOString()
      }));
    }

    function validateDeclaration(declaration) {
      var data = declaration || {};
      var representativeName = String(
        data.legalRepresentativeName || ""
      ).trim();
      var errors = {};

      if (representativeName.length < 3) {
        errors.legalRepresentativeName =
          "Le nom de la personne exerçant l’autorité parentale est requis.";
      }

      if (data.accepted !== true) {
        errors.accepted =
          "Vous devez confirmer la déclaration sur l’honneur.";
      }

      if (Object.keys(errors).length > 0) {
        return AKS.Core.Result.failure(
          "HEALTH_DECLARATION_INVALID",
          "La déclaration sur l’honneur doit être confirmée.",
          errors
        );
      }

      return AKS.Core.Result.success(Object.freeze({
        legalRepresentativeName: representativeName,
        accepted: true
      }));
    }


    function createConfirmationDto_(submission) {
      return Object.freeze({
        submissionId: String(submission.id),
        result: String(submission.result),
        status: String(submission.status),
        submittedAt: submission.submittedAt.toISOString()
      });
    }

    function submitQuestionnaire(payload) {
      var data = payload || {};
      var activeCampaignId = settings.getActiveCampaignId();
      var campaign;
      var questionnaire;
      var identityResult;
      var answersResult;
      var declarationResult;
      var decision;
      var submissionId;
      var submission;

      if (!activeCampaignId) {
        return AKS.Core.Result.failure(
          "HEALTH_ACTIVE_CAMPAIGN_NOT_CONFIGURED",
          "Aucune campagne de questionnaire santé n'est actuellement disponible."
        );
      }

      campaign = repository.findCampaignById(activeCampaignId);
      if (!campaign || campaign.status !== "OPEN") {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_NOT_OPEN",
          "La campagne de questionnaire santé n'est pas ouverte."
        );
      }

      questionnaire = repository.findQuestionnaireById(campaign.questionnaireId);
      if (!questionnaire) {
        return AKS.Core.Result.failure(
          "HEALTH_QUESTIONNAIRE_NOT_FOUND",
          "Le questionnaire associé à la campagne est introuvable."
        );
      }

      identityResult = validateIdentity(data.identity || {}, new Date());
      if (!identityResult.ok) {
        return identityResult;
      }

      answersResult = validateAnswers(questionnaire, data.answers || {});
      if (!answersResult.ok) {
        return answersResult;
      }

      declarationResult = validateDeclaration(data.declaration || {});
      if (!declarationResult.ok) {
        return declarationResult;
      }

      decision = AKS.Modules.HealthQuestionnaire.Services
        .HealthQuestionnaireDecisionEngine.evaluate(answersResult.data);
      submissionId = AKS.Modules.HealthQuestionnaire.Services
        .SubmissionIdGenerator.generate(
          campaign.season,
          campaign.id,
          repository
        );

      submission = AKS.Modules.HealthQuestionnaire.Submission({
        id: submissionId,
        campaignId: campaign.id,
        questionnaireId: questionnaire.id,
        questionnaireVersion: questionnaire.version,
        email: identityResult.data.email,
        lastName: identityResult.data.lastName,
        firstName: identityResult.data.firstName,
        birthDate: identityResult.data.birthDate,
        sex: identityResult.data.sex,
        legalRepresentativeLastName:
          identityResult.data.legalRepresentativeLastName,
        legalRepresentativeFirstName:
          identityResult.data.legalRepresentativeFirstName,
        result: decision.result,
        status: "CREATED",
        processingVersion: "rc-0.3.0",
        submittedAt: new Date()
      });

      repository.saveSubmission(submission);

      if (
        submission.result === "NO_MEDICAL_CERTIFICATE_REQUIRED" &&
        attestationService
      ) {
        submission = attestationService.generateForSubmission(submission);
      }

      return AKS.Core.Result.success(createConfirmationDto_(submission));
    }

    return Object.freeze({
      getPublicViewModel: getPublicViewModel,
      validateIdentity: validateIdentity,
      validateAnswers: validateAnswers,
      prepareDeclaration: prepareDeclaration,
      validateDeclaration: validateDeclaration,
      submitQuestionnaire: submitQuestionnaire
    });
  };
