var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Official regulatory definition for the minor health questionnaire.
 * Source: Annex II-23, article A. 231-3 of the French Sports Code.
 */
AKS.Modules.HealthQuestionnaire.MinorQuestionnaire2021 = Object.freeze({
  id: "FFK-HEALTH-QUESTIONNAIRE",
  reference: "ANNEXE II-23",
  article: "Art. A. 231-3",
  version: "2021-05-07",
  effectiveFrom: "2021-05-09",
  source: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043486824",
  title:
    "QUESTIONNAIRE RELATIF À L’ÉTAT DE SANTÉ DU SPORTIF MINEUR EN VUE DE L’OBTENTION, DU RENOUVELLEMENT D’UNE LICENCE D’UNE FÉDÉRATION SPORTIVE OU DE L’INSCRIPTION À UNE COMPÉTITION SPORTIVE AUTORISÉE PAR UNE FÉDÉRATION DÉLÉGATAIRE OU ORGANISÉE PAR UNE FÉDÉRATION AGRÉÉE, HORS DISCIPLINES À CONTRAINTES PARTICULIÈRES",
  parentWarning:
    "Avertissement à destination des parents ou de la personne ayant l’autorité parentale : Il est préférable que ce questionnaire soit complété par votre enfant, c’est à vous d’estimer à quel âge il est capable de le faire. Il est de votre responsabilité de vous assurer que le questionnaire est correctement complété et de suivre les instructions en fonction des réponses données.",
  childIntroduction:
    "Faire du sport : c’est recommandé pour tous. En as-tu parlé avec un médecin ? T’a-t-il examiné (e) pour te conseiller ? Ce questionnaire n’est pas un contrôle. Tu réponds par OUI ou par NON, mais il n’y a pas de bonnes ou de mauvaises réponses. Tu peux regarder ton carnet de santé et demander à tes parents de t’aider.",
  positiveAnswerInstruction:
    "Si tu as répondu OUI à une ou plusieurs questions, tu dois consulter un médecin pour qu’il t’examine et voie avec toi quel sport te convient. Au moment de la visite, donne-lui ce questionnaire rempli.",
  sections: Object.freeze([
    Object.freeze({
      id: "SINCE_LAST_YEAR",
      title: "Depuis l’année dernière",
      order: 1,
      questions: Object.freeze([
        "Es-tu allé (e) à l’hôpital pendant toute une journée ou plusieurs jours ?",
        "As-tu été opéré (e) ?",
        "As-tu beaucoup plus grandi que les autres années ?",
        "As-tu beaucoup maigri ou grossi ?",
        "As-tu eu la tête qui tourne pendant un effort ?",
        "As-tu perdu connaissance ou es-tu tombé sans te souvenir de ce qui s’était passé ?",
        "As-tu reçu un ou plusieurs chocs violents qui t’ont obligé à interrompre un moment une séance de sport ?",
        "As-tu eu beaucoup de mal à respirer pendant un effort par rapport à d’habitude ?",
        "As-tu eu beaucoup de mal à respirer après un effort ?",
        "As-tu eu mal dans la poitrine ou des palpitations (le cœur qui bat très vite) ?",
        "As-tu commencé à prendre un nouveau médicament tous les jours et pour longtemps ?",
        "As-tu arrêté le sport à cause d’un problème de santé pendant un mois ou plus ?"
      ])
    }),
    Object.freeze({
      id: "MORE_THAN_TWO_WEEKS",
      title: "Depuis un certain temps (plus de 2 semaines)",
      order: 2,
      questions: Object.freeze([
        "Te sens-tu très fatigué (e) ?",
        "As-tu du mal à t’endormir ou te réveilles-tu souvent dans la nuit ?",
        "Sens-tu que tu as moins faim ? Que tu manges moins ?",
        "Te sens-tu triste ou inquiet ?",
        "Pleures-tu plus souvent ?",
        "Ressens-tu une douleur ou un manque de force à cause d’une blessure que tu t’es faite cette année ?"
      ])
    }),
    Object.freeze({
      id: "TODAY",
      title: "Aujourd’hui",
      order: 3,
      questions: Object.freeze([
        "Penses-tu quelquefois à arrêter de faire du sport ou à changer de sport ?",
        "Penses-tu avoir besoin de voir ton médecin pour continuer le sport ?",
        "Souhaites-tu signaler quelque chose de plus concernant ta santé ?"
      ])
    }),
    Object.freeze({
      id: "PARENTS",
      title: "Questions à faire remplir par tes parents",
      order: 4,
      questions: Object.freeze([
        "Quelqu’un dans votre famille proche a-t-il eu une maladie grave du cœur ou du cerveau, ou est-il décédé subitement avant l’âge de 50 ans ?",
        "Etes-vous inquiet pour son poids ? Trouvez-vous qu’il se nourrit trop ou pas assez ?",
        "Avez-vous manqué l’examen de santé prévu à l’âge de votre enfant chez le médecin ? (Cet examen médical est prévu à l’âge de 2 ans, 3 ans, 4 ans, 5 ans, entre 8 et 9 ans, entre 11 et 13 ans et entre 15 et 16 ans.)"
      ])
    })
  ])
});
