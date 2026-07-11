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
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireWebController =
  function (repository, settings) {
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
          questionnaire: Object.freeze({
            title: questionnaire.title,
            source: questionnaire.source ||
              "Annexe II-23 (article A. 231-3 du Code du sport)",
            questions: Object.freeze(
              questionnaire.questions.map(function (question) {
                return Object.freeze({
                  id: question.id,
                  label: question.label,
                  order: question.order,
                  required: question.required !== false
                });
              })
            )
          }),
          flow: Object.freeze(flow),
          steps: Object.freeze({
            current: 1,
            total: flow.length
          })
        })
      );
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

    return Object.freeze({
      getPublicViewModel: getPublicViewModel,
      validateIdentity: validateIdentity
    });
  };
