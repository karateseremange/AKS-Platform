var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Contrat canonique du modèle Analytics.
 * Les objets exposés sont immuables et indépendants des sources de données.
 */
AKS.Analytics.NormalizedModel = (function () {
  "use strict";

  function freeze_(value) {
    Object.keys(value).forEach(function (key) {
      if (value[key] && typeof value[key] === "object") freeze_(value[key]);
    });
    return Object.freeze(value);
  }

  return freeze_({
    SCHEMA_VERSION: "1.0",
    ATTENDANCE_STATUS: {
      PRESENT: "PRESENT",
      ABSENT: "ABSENT",
      EXCUSE: "EXCUSE",
      NON_RENSEIGNE: "NON_RENSEIGNE",
      NON_ELIGIBLE: "NON_ELIGIBLE"
    },
    SESSION_STATUS: {
      REALISEE: "REALISEE",
      ANNULEE: "ANNULEE",
      EXCLUE: "EXCLUE"
    },
    ISSUE: {
      LICENCIE_ID_ABSENT: "LICENCIE_ID_ABSENT",
      LICENCIE_ID_INVALIDE: "LICENCIE_ID_INVALIDE",
      NUMERO_LICENCE_ABSENT: "NUMERO_LICENCE_ABSENT",
      NUMERO_LICENCE_INVALIDE: "NUMERO_LICENCE_INVALIDE",
      STATUT_PRESENCE_INCONNU: "STATUT_PRESENCE_INCONNU",
      STATUT_SEANCE_INCONNU: "STATUT_SEANCE_INCONNU",
      DATE_INVALIDE: "DATE_INVALIDE",
      PERIODE_ADHESION_INVALIDE: "PERIODE_ADHESION_INVALIDE",
      VERSION_SCHEMA_INCONNUE: "VERSION_SCHEMA_INCONNUE",
      FEMININ_HORS_PERIMETRE_HISTORIQUE: "FEMININ_HORS_PERIMETRE_HISTORIQUE",
      SEANCE_NON_REALISEE: "SEANCE_NON_REALISEE"
    }
  });
}());
