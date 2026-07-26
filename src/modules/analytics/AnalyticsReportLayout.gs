var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Compose les contenus et graphiques Analytics en mises en page logiques.
 * Composant pur : aucun calcul métier, rendu, stockage ou accès externe.
 */
AKS.Analytics.ReportLayout = (function () {
  "use strict";

  var RULE_VERSION = "analytics-report-layout/1.0.0";
  var PAGE = Object.freeze({
    format: "A4",
    orientation: "PORTRAIT",
    reading_order: "TOP_TO_BOTTOM",
    recommended_breaks: ["BEFORE_METHOD"]
  });

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function chartFor_(charts, reportCode) {
    return (charts || []).filter(function (chart) {
      return chart.report_code === reportCode;
    })[0] || null;
  }

  function section_(code, title, level, visible, content, breakBefore) {
    return {
      code: code,
      title: title,
      heading_level: level,
      visible: visible,
      content: content,
      break_before: !!breakBefore
    };
  }

  function sections_(report, chart, isGlobal) {
    var hasWarnings = (report.warnings || []).length > 0;
    var hasLimits = (report.limits || []).length > 0;
    var sections = [
      section_("SUMMARY", "Résumé", 2, true, { text: report.summary }, false),
      section_("INDICATORS", "Indicateurs", 2, true, {
        layout: "TWO_COLUMN",
        items: report.indicators || [],
        unavailable_is_zero: false
      }, false),
      section_("CHART", "Représentation graphique", 2, !!chart, {
        placement: "FULL_WIDTH",
        chart: chart
      }, false),
      section_("DATA_QUALITY", "Qualité et couverture des données", 2, true, {
        data_quality: report.data_quality || {},
        coverage_source: "INDICATORS"
      }, false),
      section_("WARNINGS", "Avertissements", 2, hasWarnings, {
        items: report.warnings || []
      }, false),
      section_("LIMITS", "Limites", 2, hasLimits, {
        items: report.limits || []
      }, false),
      section_("METHOD", "Méthode de calcul et source", 2, true, {
        calculation: "VALEURS_CALCULEES_EN_AMONT",
        source: "AKS Analytics — " + report.season,
        weighted_global: isGlobal
      }, true)
    ];
    if (isGlobal) {
      sections.splice(1, 0, section_("COURSE_OVERVIEW", "Vue d'ensemble des cours", 2, true, {
        chart_categories: chart ? chart.categories : [],
        unavailable_courses_visible: true,
        weighted_references: chart ? chart.references || [] : []
      }, false));
    }
    return sections;
  }

  function composition_(report, chart) {
    var isGlobal = report.report_type === "GLOBAL";
    return {
      composition_code: "LAYOUT_" + report.report_code,
      report_code: report.report_code,
      report_type: report.report_type,
      variant: isGlobal ? "GLOBAL" : "COURSE",
      state: report.state,
      page: PAGE,
      header: {
        product: "AKS Analytics",
        title: report.title,
        season: report.season,
        course: report.course_label,
        state: report.state
      },
      sections: sections_(report, chart, isGlobal),
      footer: {
        model_version: RULE_VERSION,
        page_number_visible: true,
        confidentiality: "STATISTIQUES_AGREGEES"
      },
      accessibility: {
        semantic_headings: true,
        logical_reading_order: true,
        charts_have_text_alternative: true,
        information_not_color_only: true,
        print_compatible: true
      }
    };
  }

  function build(reportContent, chartModel) {
    reportContent = reportContent || { reports: [] };
    chartModel = chartModel || { charts: [] };
    var compositions = (reportContent.reports || []).map(function (report) {
      return composition_(report, chartFor_(chartModel.charts, report.report_code));
    });
    return freeze_({
      rule_version: RULE_VERSION,
      source_report_rule_version: reportContent.rule_version || null,
      source_chart_rule_version: chartModel.rule_version || null,
      season: reportContent.season || "",
      page: PAGE,
      compositions: compositions
    });
  }

  return Object.freeze({ RULE_VERSION: RULE_VERSION, build: build });
}());
