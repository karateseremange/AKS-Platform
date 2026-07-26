var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Moteur pur des indicateurs activés par ANALYTICS-007.
 * Les entrées sont des présences consolidées et déjà normalisées.
 */
AKS.Analytics.IndicatorEngine = (function () {
  "use strict";

  var MODEL = AKS.Analytics.NormalizedModel;
  var STATUS = MODEL.ATTENDANCE_STATUS;
  var RULE_VERSION = "analytics-indicators/1.0.0";
  var KNOWN = {};
  KNOWN[STATUS.PRESENT] = true;
  KNOWN[STATUS.ABSENT] = true;
  KNOWN[STATUS.EXCUSE] = true;

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function emptyCounts_() {
    return {
      present: 0,
      absent: 0,
      excused: 0,
      not_recorded: 0,
      expected: 0,
      known: 0
    };
  }

  function addStatus_(counts, status) {
    counts.expected += 1;
    if (status === STATUS.PRESENT) counts.present += 1;
    else if (status === STATUS.ABSENT) counts.absent += 1;
    else if (status === STATUS.EXCUSE) counts.excused += 1;
    else if (status === STATUS.NON_RENSEIGNE) counts.not_recorded += 1;
    if (KNOWN[status]) counts.known += 1;
  }

  function addCounts_(target, source) {
    Object.keys(target).forEach(function (key) { target[key] += source[key]; });
  }

  function result_(indicatorId, scopeType, scopeId, season, period, counts, diagnostics) {
    var calculable = counts.known > 0;
    var coverage = counts.expected > 0 ? counts.known / counts.expected : null;
    return {
      indicator_id: indicatorId,
      rule_version: RULE_VERSION,
      scope_type: scopeType,
      scope_id: scopeId,
      season: season,
      period: period,
      value: calculable ? counts.present / counts.known : null,
      numerator: counts.present,
      denominator: counts.known,
      expected_count: counts.expected,
      known_count: counts.known,
      coverage_rate: coverage,
      status: !calculable ? "NON_CALCULABLE" :
        (counts.known < counts.expected ? "PARTIEL" : "VALIDE"),
      counts: {
        present: counts.present,
        absent: counts.absent,
        excused: counts.excused,
        not_recorded: counts.not_recorded
      },
      diagnostics: (diagnostics || []).slice()
    };
  }

  function aggregate_(results, indicatorId, scopeType, scopeId, season, period, diagnostics) {
    var counts = emptyCounts_();
    results.forEach(function (item) {
      counts.present += item.numerator;
      counts.known += item.denominator;
      counts.expected += item.expected_count;
      counts.absent += item.counts.absent;
      counts.excused += item.counts.excused;
      counts.not_recorded += item.counts.not_recorded;
    });
    return result_(indicatorId, scopeType, scopeId, season, period, counts, diagnostics);
  }

  function disabled_(indicatorId, scopeType, scopeId, season, period) {
    return {
      indicator_id: indicatorId,
      rule_version: RULE_VERSION,
      scope_type: scopeType,
      scope_id: scopeId,
      season: season,
      period: period,
      value: null,
      numerator: 0,
      denominator: 0,
      expected_count: 0,
      known_count: 0,
      coverage_rate: null,
      status: "NON_CALCULABLE",
      diagnostics: ["REGLE_DESACTIVEE"]
    };
  }

  function canonicalRow_(row) {
    return {
      season: text_(row.season),
      course_code: text_(row.course_code).toUpperCase(),
      session_date: text_(row.session_date),
      licencie_id: text_(row.licencie_id),
      status: text_(row.status).toUpperCase(),
      session_status: text_(row.session_status || MODEL.SESSION_STATUS.REALISEE).toUpperCase()
    };
  }

  function calculate(input) {
    input = input || {};
    var rows = (input.attendances || []).map(canonicalRow_);
    var participationGroups = {};
    var assiduityGroups = {};
    var exclusions = [];

    rows.forEach(function (row) {
      if (row.season === "2025-2026" && row.course_code === "FEMININ") {
        exclusions.push({ code: "FEMININ_HORS_PERIMETRE_HISTORIQUE", row: row });
        return;
      }
      if (row.session_status !== MODEL.SESSION_STATUS.REALISEE) {
        exclusions.push({ code: "SEANCE_NON_REALISEE", row: row });
        return;
      }
      if (row.status === STATUS.NON_ELIGIBLE) return;
      if (!KNOWN[row.status] && row.status !== STATUS.NON_RENSEIGNE) {
        exclusions.push({ code: "STATUT_PRESENCE_INCONNU", row: row });
        return;
      }

      var sessionKey = [row.season, row.course_code, row.session_date].join("|");
      var memberKey = [row.season, row.course_code, row.licencie_id].join("|");
      participationGroups[sessionKey] = participationGroups[sessionKey] || {
        season: row.season, course: row.course_code, date: row.session_date, counts: emptyCounts_()
      };
      assiduityGroups[memberKey] = assiduityGroups[memberKey] || {
        season: row.season, course: row.course_code, member: row.licencie_id, counts: emptyCounts_()
      };
      addStatus_(participationGroups[sessionKey].counts, row.status);
      addStatus_(assiduityGroups[memberKey].counts, row.status);
    });

    var participation = Object.keys(participationGroups).sort().map(function (key) {
      var group = participationGroups[key];
      return result_(
        "IND-PARTICIPATION-001", "SESSION", key, group.season, group.date,
        group.counts, group.counts.not_recorded ? ["COUVERTURE_INCOMPLETE"] : []
      );
    });
    var assiduity = Object.keys(assiduityGroups).sort().map(function (key) {
      var group = assiduityGroups[key];
      return result_(
        "IND-ASSIDUITE-001", "MEMBER", key, group.season, null,
        group.counts, group.counts.not_recorded ? ["COUVERTURE_INCOMPLETE"] : []
      );
    });

    function aggregateByCourse_(items, indicatorId) {
      var grouped = {};
      items.forEach(function (item) {
        var parts = item.scope_id.split("|");
        var key = parts[0] + "|" + parts[1];
        grouped[key] = grouped[key] || [];
        grouped[key].push(item);
      });
      return Object.keys(grouped).sort().map(function (key) {
        return aggregate_(grouped[key], indicatorId, "COURSE", key, key.split("|")[0], null);
      });
    }

    var participationCourses = aggregateByCourse_(participation, "IND-PARTICIPATION-001");
    var assiduityCourses = aggregateByCourse_(assiduity, "IND-ASSIDUITE-001");
    var seasons = {};
    participationCourses.concat(assiduityCourses).forEach(function (item) { seasons[item.season] = true; });
    var global = [];
    Object.keys(seasons).sort().forEach(function (season) {
      var p = participationCourses.filter(function (item) { return item.season === season; });
      var a = assiduityCourses.filter(function (item) { return item.season === season; });
      global.push(aggregate_(p, "IND-PARTICIPATION-001", "GLOBAL", season, season, null));
      global.push(aggregate_(a, "IND-ASSIDUITE-001", "GLOBAL", season, season, null));
    });

    return freeze_({
      rule_version: RULE_VERSION,
      participation: participation,
      assiduity: assiduity,
      course_aggregates: {
        participation: participationCourses,
        assiduity: assiduityCourses
      },
      global_aggregates: global,
      disabled_indicators: [
        disabled_("IND-REGULARITE-001", "GLOBAL", "ALL", null, null),
        disabled_("IND-STABILITE-001", "GLOBAL", "ALL", null, null),
        disabled_("IND-FIDELITE-001", "GLOBAL", "ALL", null, null)
      ],
      exclusions: exclusions
    });
  }

  return Object.freeze({
    RULE_VERSION: RULE_VERSION,
    calculate: calculate
  });
}());
