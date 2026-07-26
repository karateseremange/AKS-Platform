var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Normalisateur métier pur Analytics.
 * Aucune lecture Google Sheets et aucune mutation des données d'entrée.
 */
AKS.Analytics.Normalizer = (function () {
  "use strict";

  var MODEL = AKS.Analytics.NormalizedModel;
  var ISSUE = MODEL.ISSUE;
  var LEGACY_STATUS = {
    P: MODEL.ATTENDANCE_STATUS.PRESENT,
    A: MODEL.ATTENDANCE_STATUS.ABSENT,
    E: MODEL.ATTENDANCE_STATUS.EXCUSE,
    "": MODEL.ATTENDANCE_STATUS.NON_RENSEIGNE
  };

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

    if (!memberId) errors.push(ISSUE.LICENCIE_ID_ABSENT);
    else if (!/^LIC-\d{6}$/.test(memberId)) errors.push(ISSUE.LICENCIE_ID_INVALIDE);

    if (!licenceNumber) warnings.push(ISSUE.NUMERO_LICENCE_ABSENT);
    else if (!/^\d{8}$/.test(licenceNumber)) errors.push(ISSUE.NUMERO_LICENCE_INVALIDE);

    return result_({
      licencie_id: memberId || null,
      numero_licence: licenceNumber || null
    }, errors, warnings);
  }

  function normalizeAttendanceStatus(value) {
    var key = text_(value).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(LEGACY_STATUS, key)) {
      return result_(LEGACY_STATUS[key]);
    }
    if (Object.prototype.hasOwnProperty.call(MODEL.ATTENDANCE_STATUS, key)) {
      return result_(MODEL.ATTENDANCE_STATUS[key]);
    }
    return result_(null, [ISSUE.STATUT_PRESENCE_INCONNU]);
  }

  function normalizeEligibility(sessionDate, entryDate, exitDate) {
    var values = [sessionDate, entryDate, exitDate];
    var invalid = values.some(function (value, index) {
      return (index < 2 || text_(value)) && !isIsoDate_(text_(value));
    });
    if (invalid) return result_(null, [ISSUE.DATE_INVALIDE]);

    sessionDate = text_(sessionDate);
    entryDate = text_(entryDate);
    exitDate = text_(exitDate);
    if (exitDate && exitDate < entryDate) {
      return result_(null, [ISSUE.PERIODE_ADHESION_INVALIDE]);
    }
    return result_(
      sessionDate < entryDate || (exitDate && sessionDate > exitDate) ?
        MODEL.ATTENDANCE_STATUS.NON_ELIGIBLE : "ELIGIBLE"
    );
  }

  function normalizeSession(raw) {
    raw = raw || {};
    var status = text_(raw.status).toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(MODEL.SESSION_STATUS, status)) {
      return result_(null, [ISSUE.STATUT_SEANCE_INCONNU]);
    }
    if (status !== MODEL.SESSION_STATUS.REALISEE) {
      return result_({ status: status, included: false }, [], [], [ISSUE.SEANCE_NON_REALISEE]);
    }
    return result_({ status: status, included: true });
  }

  function validateSchemaVersion(version) {
    return text_(version) === MODEL.SCHEMA_VERSION ?
      result_(MODEL.SCHEMA_VERSION) :
      result_(null, [ISSUE.VERSION_SCHEMA_INCONNUE]);
  }

  function normalizeCourse(raw) {
    raw = raw || {};
    var season = text_(raw.season);
    var code = text_(raw.code).toUpperCase();
    if (season === "2025-2026" && code === "FEMININ") {
      return result_(null, [], [], [ISSUE.FEMININ_HORS_PERIMETRE_HISTORIQUE]);
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
