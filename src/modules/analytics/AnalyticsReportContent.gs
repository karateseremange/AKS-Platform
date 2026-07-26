var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Produit le contenu éditorial structuré des rapports Analytics.
 * Composant pur : aucun rendu, calcul métier, stockage ou accès externe.
 */
AKS.Analytics.ReportContent = (function () {
  "use strict";

  var RULE_VERSION = "analytics-report-content/1.0.0";
  var GLOBAL_CODE = "GLOBAL";
  var DISABLED_LABELS = Object.freeze({
    "IND-REGULARITE-001": "Régularité",
    "IND-STABILITE-001": "Stabilité",
    "IND-FIDELITE-001": "Fidélité"
  });

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function metric_(name, metric) {
    metric = metric || {};
    return {
      code: name === "Participation" ? "PARTICIPATION" : "ASSIDUITE",
      label: name,
      state: metric.status || "NON_CALCULABLE",
      raw_value: metric.raw_value === undefined ? null : metric.raw_value,
      display_value: metric.display_percentage === null ||
        metric.display_percentage === undefined ? "Non calculable" :
        metric.display_percentage.toFixed(1).replace(".", ",") + " %",
      numerator: metric.numerator || 0,
      denominator: metric.denominator || 0,
      coverage_rate: metric.coverage_rate === undefined ? null : metric.coverage_rate,
      display_coverage: metric.display_coverage_percentage === null ||
        metric.display_coverage_percentage === undefined ? "Non calculable" :
        metric.display_coverage_percentage.toFixed(1).replace(".", ",") + " %"
    };
  }

  function factualSummary_(label, state, indicators) {
    if (state === "NON_CALCULABLE" || state === "ERREUR") {
      return "Les données disponibles ne permettent pas de calculer les indicateurs pour " + label + ".";
    }
    return label + " : participation " + indicators[0].display_value +
      ", assiduité " + indicators[1].display_value + ".";
  }

  function warnings_(course) {
    var warnings = (course.data_quality.warning_codes || []).concat(
      course.data_quality.exclusion_codes || []
    ).slice().sort();
    if (!course.available) warnings.push("RESULTAT_NON_CALCULABLE");
    return warnings;
  }

  function limits_(model) {
    var limits = (model.report.limits || []).map(function (item) {
      return { code: item.code, message: item.message || null };
    });
    (model.disabled_indicator_ids || []).forEach(function (id) {
      limits.push({
        code: "INDICATEUR_NON_CALCULABLE",
        indicator_id: id,
        label: DISABLED_LABELS[id] || id
      });
    });
    return limits;
  }

  function courseReport_(model, course, sharedLimits) {
    var state = course.available ? course.state : "NON_CALCULABLE";
    var indicators = [
      metric_("Participation", course.indicators.participation),
      metric_("Assiduité", course.indicators.assiduity)
    ];
    return {
      report_code: course.course_code,
      report_type: "COURS",
      title: "Rapport Analytics — " + course.label,
      season: model.season,
      course_code: course.course_code,
      course_label: course.label,
      state: state,
      summary: factualSummary_(course.label, state, indicators),
      indicators: indicators,
      data_quality: {
        accepted_count: course.data_quality.accepted_count,
        duplicate_count: course.data_quality.duplicate_count,
        rejected_count: course.data_quality.rejected_count
      },
      warnings: warnings_(course),
      limits: sharedLimits
    };
  }

  function globalReport_(model, sharedLimits) {
    var global = model.report.global && model.report.global.length ?
      model.report.global[0] : null;
    var state = global ? model.state : "NON_CALCULABLE";
    var indicators = [
      metric_("Participation", global && global.indicators.participation),
      metric_("Assiduité", global && global.indicators.assiduity)
    ];
    var warnings = (model.report.warnings || []).slice().sort();
    (model.data_quality.missing_courses || []).forEach(function (code) {
      warnings.push("COURS_ABSENT:" + code);
    });
    (model.data_quality.unavailable_courses || []).forEach(function (code) {
      warnings.push("COURS_NON_CALCULABLE:" + code);
    });
    return {
      report_code: GLOBAL_CODE,
      report_type: "GLOBAL",
      title: "Synthèse globale AKS Analytics",
      season: model.season,
      course_code: null,
      course_label: null,
      state: state,
      summary: factualSummary_("Synthèse globale", state, indicators),
      indicators: indicators,
      data_quality: {
        accepted_count: model.data_quality.accepted_count,
        duplicate_count: model.data_quality.duplicate_count,
        rejected_count: model.data_quality.rejected_count,
        expected_course_count: model.report.summary.expected_course_count,
        available_course_count: model.report.summary.available_course_count
      },
      warnings: warnings.sort(),
      limits: sharedLimits
    };
  }

  function build(model) {
    model = model || {};
    var report = model.report || { courses: [], global: [], limits: [], summary: {} };
    var normalized = {
      season: model.season || "",
      state: model.state || "ERREUR",
      report: report,
      data_quality: model.data_quality || {
        accepted_count: 0, duplicate_count: 0, rejected_count: 0,
        missing_courses: [], unavailable_courses: []
      },
      disabled_indicator_ids: model.disabled_indicator_ids || []
    };
    var sharedLimits = limits_(normalized);
    var reports = (report.courses || []).map(function (course) {
      return courseReport_(normalized, course, sharedLimits);
    });
    reports.push(globalReport_(normalized, sharedLimits));
    reports.sort(function (left, right) {
      if (left.report_type !== right.report_type) return left.report_type === "COURS" ? -1 : 1;
      return left.report_code.localeCompare(right.report_code);
    });
    return freeze_({
      rule_version: RULE_VERSION,
      source_rule_version: model.rule_version || null,
      season: normalized.season,
      reports: reports
    });
  }

  return Object.freeze({ RULE_VERSION: RULE_VERSION, build: build });
}());
