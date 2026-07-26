var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Consolide des présences déjà normalisées.
 * Composant pur : aucune lecture externe et aucune mutation des entrées.
 */
AKS.Analytics.Consolidator = (function () {
  "use strict";

  var MODEL = AKS.Analytics.NormalizedModel;
  var ISSUE = MODEL.ISSUE;

  function clone_(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function attendanceKey_(row) {
    return [
      text_(row.season),
      text_(row.course_code).toUpperCase(),
      text_(row.session_date),
      text_(row.licencie_id)
    ].join("|");
  }

  function canonicalAttendance_(row) {
    return {
      season: text_(row.season),
      course_code: text_(row.course_code).toUpperCase(),
      session_date: text_(row.session_date),
      licencie_id: text_(row.licencie_id),
      status: text_(row.status).toUpperCase()
    };
  }

  function diagnostic_(code, key, details) {
    return { code: code, key: key || null, details: details || null };
  }

  function duplicateLicenceDiagnostics_(members) {
    var byLicence = {};
    (members || []).forEach(function (member) {
      var licence = text_(member.numero_licence);
      var memberId = text_(member.licencie_id);
      if (!licence || !memberId) return;
      byLicence[licence] = byLicence[licence] || {};
      byLicence[licence][memberId] = true;
    });

    return Object.keys(byLicence).sort().filter(function (licence) {
      return Object.keys(byLicence[licence]).length > 1;
    }).map(function (licence) {
      return diagnostic_(ISSUE.NUMERO_LICENCE_DUPLIQUE, licence, {
        licencie_ids: Object.keys(byLicence[licence]).sort()
      });
    });
  }

  function consolidate(input) {
    input = input || {};
    var groups = {};
    var accepted = [];
    var duplicates = [];
    var rejected = [];
    var errors = duplicateLicenceDiagnostics_(input.members);
    var warnings = clone_(input.warnings || []);
    var exclusions = clone_(input.exclusions || []);

    (input.attendances || []).forEach(function (sourceRow, index) {
      var row = canonicalAttendance_(sourceRow);
      var key = attendanceKey_(row);
      groups[key] = groups[key] || [];
      groups[key].push({ row: row, source_index: index });
    });

    Object.keys(groups).sort().forEach(function (key) {
      var group = groups[key].slice().sort(function (left, right) {
        var leftValue = JSON.stringify(left.row);
        var rightValue = JSON.stringify(right.row);
        return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      });
      var statuses = {};
      group.forEach(function (item) { statuses[item.row.status] = true; });

      if (Object.keys(statuses).length > 1) {
        group.forEach(function (item) {
          rejected.push({
            row: item.row,
            reason: ISSUE.DOUBLON_CONTRADICTOIRE
          });
        });
        errors.push(diagnostic_(ISSUE.DOUBLON_CONTRADICTOIRE, key, {
          statuses: Object.keys(statuses).sort(),
          rejected_count: group.length
        }));
        return;
      }

      accepted.push(group[0].row);
      group.slice(1).forEach(function (item) {
        duplicates.push({
          row: item.row,
          reason: ISSUE.DOUBLON_IDENTIQUE
        });
      });
      if (group.length > 1) {
        warnings.push(diagnostic_(ISSUE.DOUBLON_IDENTIQUE, key, {
          neutralized_count: group.length - 1
        }));
      }
    });

    var state = MODEL.DATASET_STATE.VALIDE;
    if (errors.length || warnings.length || exclusions.length || duplicates.length || rejected.length) {
      state = accepted.length ? MODEL.DATASET_STATE.PARTIEL : MODEL.DATASET_STATE.ERREUR;
    }

    return freeze_({
      accepted: accepted,
      duplicates: duplicates,
      rejected: rejected,
      diagnostics: { errors: errors, warnings: warnings, exclusions: exclusions },
      state: state
    });
  }

  return Object.freeze({
    attendanceKey: attendanceKey_,
    consolidate: consolidate
  });
}());
