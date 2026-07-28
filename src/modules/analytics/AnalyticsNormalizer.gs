var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Normalisateur métier pur Analytics.
 * Aucune lecture Google Sheets et aucune mutation des données d'entrée.
 */
AKS.Analytics.Normalizer = (function () {
  "use strict";

  function model_() {
    var model = AKS.Analytics.NormalizedModel;
    if (!model) throw new Error("AnalyticsNormalizer: dépendance AnalyticsNormalizedModel indisponible.");
    return model;
  }

  function issue_() {
    return model_().ISSUE;
  }

  function legacyStatus_() {
    var status = model_().ATTENDANCE_STATUS;
    return {
      P: status.PRESENT,
      A: status.ABSENT,
      E: status.EXCUSE,
      "": status.NON_RENSEIGNE
    };
  }

  function result_(value, errors, warnings, exclusions) {
    return Object.freeze({
      value: value,
      errors: Object.freeze(errors || []),
      warnings: Object.freeze(warnings || []),
      exclusions: Object.freeze(exclusions || [])
    });
  }

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function isIsoDate_(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split("-");
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return date.toISOString().slice(0, 10) === value;
  }

  function normalizeMember(raw) {
    raw = raw || {};
    var errors = [];
    var warnings = [];
    var memberId = text_(raw.licencie_id || raw.memberId);
    var licenceNumber = text_(raw.numero_licence || raw.licenceNumber);

    if (!memberId) errors.push(issue_().LICENCIE_ID_ABSENT);
    else if (!/^LIC-\d{6}$/.test(memberId)) errors.push(issue_().LICENCIE_ID_INVALIDE);

    if (!licenceNumber) warnings.push(issue_().NUMERO_LICENCE_ABSENT);
    else if (!/^\d{8}$/.test(licenceNumber)) errors.push(issue_().NUMERO_LICENCE_INVALIDE);

    return result_({
      licencie_id: memberId || null,
      numero_licence: licenceNumber || null
    }, errors, warnings);
  }

  function normalizeAttendanceStatus(value) {
    var key = text_(value).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(legacyStatus_(), key)) {
      return result_(legacyStatus_()[key]);
    }
    if (Object.prototype.hasOwnProperty.call(model_().ATTENDANCE_STATUS, key)) {
      return result_(model_().ATTENDANCE_STATUS[key]);
    }
    return result_(null, [issue_().STATUT_PRESENCE_INCONNU]);
  }

  function normalizeEligibility(sessionDate, entryDate, exitDate) {
    var values = [sessionDate, entryDate, exitDate];
    var invalid = values.some(function (value, index) {
      return (index < 2 || text_(value)) && !isIsoDate_(text_(value));
    });
    if (invalid) return result_(null, [issue_().DATE_INVALIDE]);

    sessionDate = text_(sessionDate);
    entryDate = text_(entryDate);
    exitDate = text_(exitDate);
    if (exitDate && exitDate < entryDate) {
      return result_(null, [issue_().PERIODE_ADHESION_INVALIDE]);
    }
    return result_(
      sessionDate < entryDate || (exitDate && sessionDate > exitDate) ?
        model_().ATTENDANCE_STATUS.NON_ELIGIBLE : "ELIGIBLE"
    );
  }

  function normalizeSession(raw) {
    raw = raw || {};
    var status = text_(raw.status).toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(model_().SESSION_STATUS, status)) {
      return result_(null, [issue_().STATUT_SEANCE_INCONNU]);
    }
    if (status !== model_().SESSION_STATUS.REALISEE) {
      return result_({ status: status, included: false }, [], [], [issue_().SEANCE_NON_REALISEE]);
    }
    return result_({ status: status, included: true });
  }

  function validateSchemaVersion(version) {
    return text_(version) === model_().SCHEMA_VERSION ?
      result_(model_().SCHEMA_VERSION) :
      result_(null, [issue_().VERSION_SCHEMA_INCONNUE]);
  }

  function normalizeCourse(raw) {
    raw = raw || {};
    var season = text_(raw.season);
    var code = text_(raw.code).toUpperCase();
    if (season === "2025-2026" && code === "FEMININ") {
      return result_(null, [], [], [issue_().FEMININ_HORS_PERIMETRE_HISTORIQUE]);
    }
    return result_({ season: season, code: code });
  }

  return Object.freeze({
    normalizeAttendanceStatus: normalizeAttendanceStatus,
    normalizeCourse: normalizeCourse,
    normalizeEligibility: normalizeEligibility,
    normalizeMember: normalizeMember,
    normalizeSession: normalizeSession,
    validateSchemaVersion: validateSchemaVersion
  });
}());
