var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Transforme les contenus de rapports Analytics en spécifications graphiques.
 * Composant pur : aucun calcul métier, rendu, stockage ou accès externe.
 */
AKS.Analytics.ChartModel = (function () {
  "use strict";

  var RULE_VERSION = "analytics-chart-model/1.0.0";
  var PALETTE = Object.freeze({
    participation: "#1F5A94",
    assiduity: "#D97706",
    coverage: "#4B5563",
    unavailable: "#D1D5DB"
  });
  var PATTERNS = Object.freeze({
    participation: "SOLID",
    assiduity: "DIAGONAL",
    coverage: "DOTS",
    unavailable: "CROSS"
  });

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function indicator_(report, code) {
    return (report.indicators || []).filter(function (item) {
      return item.code === code;
    })[0] || {};
  }

  function point_(indicator) {
    var calculable = indicator.state !== "NON_CALCULABLE" &&
      indicator.raw_value !== null && indicator.raw_value !== undefined;
    return {
      value: calculable ? indicator.raw_value * 100 : null,
      display_value: calculable ? indicator.display_value : "Indisponible",
      state: calculable ? indicator.state : "NON_CALCULABLE",
      available: calculable,
      numerator: indicator.numerator || 0,
      denominator: indicator.denominator || 0,
      coverage_rate: indicator.coverage_rate === undefined ? null : indicator.coverage_rate,
      display_coverage: indicator.display_coverage || "Non calculable"
    };
  }

  function series_(code, label, color, pattern, points) {
    return {
      code: code,
      label: label,
      color: color,
      pattern: pattern,
      points: points
    };
  }

  function courseChart_(report) {
    var participation = point_(indicator_(report, "PARTICIPATION"));
    var assiduity = point_(indicator_(report, "ASSIDUITE"));
    return {
      chart_code: "CHART_" + report.report_code,
      report_code: report.report_code,
      chart_type: "GROUPED_BAR",
      title: report.title + " — Participation et assiduité",
      state: report.state,
      axis: { minimum: 0, maximum: 100, unit: "%", tick_interval: 10 },
      categories: [report.course_label],
      series: [
        series_("PARTICIPATION", "Participation", PALETTE.participation, PATTERNS.participation, [participation]),
        series_("ASSIDUITE", "Assiduité", PALETTE.assiduity, PATTERNS.assiduity, [assiduity])
      ],
      coverage: {
        participation: participation.display_coverage,
        assiduity: assiduity.display_coverage,
        color: PALETTE.coverage,
        pattern: PATTERNS.coverage
      },
      legend: { visible: true, position: "BOTTOM" },
      unavailable_convention: {
        label: "Indisponible",
        color: PALETTE.unavailable,
        pattern: PATTERNS.unavailable,
        zero_is_not_unavailable: true
      },
      source: "AKS Analytics — " + report.season
    };
  }

  function globalChart_(globalReport, courseReports) {
    var categories = courseReports.map(function (report) { return report.course_label; });
    function points_(code) {
      return courseReports.map(function (report) { return point_(indicator_(report, code)); });
    }
    return {
      chart_code: "CHART_GLOBAL",
      report_code: "GLOBAL",
      chart_type: "GROUPED_BAR_WITH_REFERENCE",
      title: "Synthèse globale — comparaison des cours",
      state: globalReport.state,
      axis: { minimum: 0, maximum: 100, unit: "%", tick_interval: 10 },
      categories: categories,
      series: [
        series_("PARTICIPATION", "Participation", PALETTE.participation, PATTERNS.participation, points_("PARTICIPATION")),
        series_("ASSIDUITE", "Assiduité", PALETTE.assiduity, PATTERNS.assiduity, points_("ASSIDUITE"))
      ],
      references: [
        { code: "GLOBAL_PARTICIPATION", label: "Participation globale", point: point_(indicator_(globalReport, "PARTICIPATION")) },
        { code: "GLOBAL_ASSIDUITE", label: "Assiduité globale", point: point_(indicator_(globalReport, "ASSIDUITE")) }
      ],
      aggregation: "PONDEREE_EN_AMONT",
      legend: { visible: true, position: "BOTTOM" },
      unavailable_convention: {
        label: "Indisponible",
        color: PALETTE.unavailable,
        pattern: PATTERNS.unavailable,
        zero_is_not_unavailable: true
      },
      source: "AKS Analytics — " + globalReport.season
    };
  }

  function build(reportContent) {
    reportContent = reportContent || { reports: [] };
    var reports = reportContent.reports || [];
    var courseReports = reports.filter(function (report) { return report.report_type === "COURS"; });
    var globalReport = reports.filter(function (report) { return report.report_type === "GLOBAL"; })[0] || {
      report_code: "GLOBAL", report_type: "GLOBAL", title: "Synthèse globale AKS Analytics",
      season: reportContent.season || "", state: "NON_CALCULABLE", indicators: []
    };
    var charts = courseReports.map(courseChart_);
    charts.push(globalChart_(globalReport, courseReports));
    return freeze_({
      rule_version: RULE_VERSION,
      source_rule_version: reportContent.rule_version || null,
      season: reportContent.season || "",
      palette: PALETTE,
      patterns: PATTERNS,
      charts: charts
    });
  }

  return Object.freeze({ RULE_VERSION: RULE_VERSION, build: build });
}());
