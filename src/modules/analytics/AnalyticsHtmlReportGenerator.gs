var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Génère les rapports AKS Analytics en documents HTML A4 autonomes.
 * Composant pur : aucun recalcul métier, stockage ou accès externe.
 */
AKS.Analytics.HtmlReportGenerator = (function () {
  "use strict";

  var RULE_VERSION = "analytics-html-report/1.0.0";
  var MIME_TYPE = "text/html";

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function escape_(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function slug_(value) {
    return String(value || "rapport").toLowerCase()
      .replace(/[àáâä]/g, "a").replace(/[éèêë]/g, "e")
      .replace(/[îï]/g, "i").replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function fingerprint_(text) {
    var hash = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
  }

  function indicatorHtml_(indicator) {
    return '<article class="indicator indicator--' + escape_(String(indicator.state || "").toLowerCase()) + '">' +
      '<h3>' + escape_(indicator.label) + '</h3><p class="value">' + escape_(indicator.display_value) + '</p>' +
      '<dl><div><dt>Valeur auditée</dt><dd>' + escape_(indicator.numerator) + " / " +
      escape_(indicator.denominator) + '</dd></div><div><dt>Couverture</dt><dd>' +
      escape_(indicator.display_coverage) + '</dd></div><div><dt>État</dt><dd>' +
      escape_(indicator.state) + '</dd></div></dl></article>';
  }

  function listHtml_(items) {
    if (!items || !items.length) return "";
    return "<ul>" + items.map(function (item) {
      var value = typeof item === "string" ? item : (item.message || item.label || item.code);
      return "<li>" + escape_(value) + "</li>";
    }).join("") + "</ul>";
  }

  function dataQualityHtml_(quality) {
    quality = quality || {};
    var labels = {
      accepted_count: "Enregistrements acceptés", duplicate_count: "Doublons neutralisés",
      rejected_count: "Enregistrements rejetés", expected_course_count: "Cours attendus",
      available_course_count: "Cours disponibles"
    };
    return "<dl class=\"quality\">" + Object.keys(labels).filter(function (key) {
      return quality[key] !== undefined;
    }).map(function (key) {
      return "<div><dt>" + labels[key] + "</dt><dd>" + escape_(quality[key]) + "</dd></div>";
    }).join("") + "</dl>";
  }

  function chartText_(chart) {
    var parts = [];
    (chart.categories || []).forEach(function (category, index) {
      var values = (chart.series || []).map(function (series) {
        var point = (series.points || [])[index] || {};
        return series.label + " : " + (point.available ? point.display_value : "Indisponible");
      });
      parts.push(category + " — " + values.join(", "));
    });
    (chart.references || []).forEach(function (reference) {
      parts.push(reference.label + " : " +
        (reference.point && reference.point.available ? reference.point.display_value : "Indisponible"));
    });
    return parts.join(". ");
  }

  function svg_(chart) {
    if (!chart) return "";
    var categories = chart.categories || [];
    var series = chart.series || [];
    var width = 760;
    var height = Math.max(250, 110 + categories.length * 72);
    var plotLeft = 165;
    var plotWidth = 540;
    var rows = [];
    categories.forEach(function (category, categoryIndex) {
      var baseY = 55 + categoryIndex * 72;
      rows.push('<text x="155" y="' + (baseY + 18) + '" text-anchor="end">' + escape_(category) + "</text>");
      series.forEach(function (serie, seriesIndex) {
        var point = (serie.points || [])[categoryIndex] || {};
        var y = baseY + seriesIndex * 25;
        if (point.available) {
          var barWidth = Math.max(0, Math.min(100, point.value)) * plotWidth / 100;
          var pattern = seriesIndex === 0 ? "" : ' fill="url(#diagonal)"';
          rows.push('<rect x="' + plotLeft + '" y="' + y + '" width="' + barWidth +
            '" height="18" fill="' + escape_(serie.color) + '"' + pattern + '/>');
          rows.push('<text x="' + (plotLeft + barWidth + 6) + '" y="' + (y + 14) + '">' +
            escape_(point.display_value) + "</text>");
        } else {
          rows.push('<rect x="' + plotLeft + '" y="' + y + '" width="' + plotWidth +
            '" height="18" fill="url(#cross)"/><text x="' + (plotLeft + 8) + '" y="' + (y + 14) +
            '">Indisponible</text>');
        }
      });
    });
    var ticks = [];
    for (var tick = 0; tick <= 100; tick += 20) {
      var x = plotLeft + tick * plotWidth / 100;
      ticks.push('<line x1="' + x + '" y1="40" x2="' + x + '" y2="' + (height - 45) +
        '" class="grid"/><text x="' + x + '" y="' + (height - 20) + '" text-anchor="middle">' + tick + " %</text>");
    }
    var alternative = chartText_(chart);
    return '<figure><svg viewBox="0 0 ' + width + " " + height +
      '" role="img" aria-label="' + escape_(alternative) + '"><title>' + escape_(chart.title) +
      '</title><defs><pattern id="diagonal" width="8" height="8" patternUnits="userSpaceOnUse">' +
      '<rect width="8" height="8" fill="#D97706"/><path d="M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6" stroke="#111827" stroke-width="1"/></pattern>' +
      '<pattern id="cross" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#D1D5DB"/>' +
      '<path d="M0,0 L8,8 M8,0 L0,8" stroke="#4B5563" stroke-width="1"/></pattern></defs>' +
      ticks.join("") + rows.join("") + '</svg><figcaption>' + escape_(alternative) + "</figcaption></figure>";
  }

  function sectionHtml_(section) {
    if (!section.visible) return "";
    var body = "";
    if (section.code === "SUMMARY") body = "<p>" + escape_(section.content.text) + "</p>";
    else if (section.code === "INDICATORS") body = '<div class="indicators">' +
      (section.content.items || []).map(indicatorHtml_).join("") + "</div>";
    else if (section.code === "CHART") body = svg_(section.content.chart);
    else if (section.code === "DATA_QUALITY") body = dataQualityHtml_(section.content.data_quality);
    else if (section.code === "WARNINGS" || section.code === "LIMITS") body = listHtml_(section.content.items);
    else if (section.code === "COURSE_OVERVIEW") body = "<p>Comparaison des cours disponibles et références globales pondérées.</p>";
    else if (section.code === "METHOD") body = "<p>Les valeurs sont calculées en amont par AKS Analytics. " +
      (section.content.weighted_global ? "Les indicateurs globaux sont agrégés de manière pondérée. " : "") +
      "Source : " + escape_(section.content.source) + ".</p>";
    return '<section' + (section.break_before ? ' class="page-break"' : "") + '><h2>' +
      escape_(section.title) + "</h2>" + body + "</section>";
  }

  function css_() {
    return '@page{size:A4 portrait;margin:14mm 14mm 16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;font-size:10.5pt;line-height:1.45}' +
      'header{border-bottom:4px solid #1F5A94;padding-bottom:8mm;margin-bottom:7mm}h1{font-size:22pt;margin:0 0 2mm}h2{font-size:14pt;color:#1F5A94;border-bottom:1px solid #cbd5e1;padding-bottom:2mm;margin:8mm 0 4mm}h3{font-size:11pt;margin:0}.meta{display:flex;gap:8mm;flex-wrap:wrap}.state{font-weight:bold;border:1px solid #475569;padding:1mm 3mm;border-radius:2mm}.indicators{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.indicator{border:1px solid #94a3b8;border-left:5px solid #1F5A94;padding:4mm;break-inside:avoid}.indicator:nth-child(2){border-left-color:#D97706}.value{font-size:18pt;font-weight:bold;margin:2mm 0}.indicator dl,.quality{margin:0}.indicator dl div,.quality div{display:flex;justify-content:space-between;border-top:1px dotted #cbd5e1;padding:1.5mm 0}.indicator dt,.quality dt{font-weight:bold}.indicator dd,.quality dd{margin:0}figure{margin:0;break-inside:avoid}svg{width:100%;height:auto;border:1px solid #cbd5e1;background:#fff}svg text{font:12px Arial,sans-serif;fill:#111827}.grid{stroke:#e2e8f0;stroke-width:1}figcaption{font-size:9pt;margin-top:2mm;color:#334155}footer{margin-top:8mm;border-top:1px solid #94a3b8;padding-top:3mm;font-size:8.5pt;display:flex;justify-content:space-between}.page-break{break-before:page;page-break-before:always}section,article{break-inside:avoid}@media print{a{color:inherit;text-decoration:none}}@media(max-width:700px){.indicators{grid-template-columns:1fr}}';
  }

  function document_(composition, sourceVersions, season) {
    var html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>" + escape_(composition.header.title) + "</title><style>" + css_() + "</style></head><body>" +
      '<header><p>AKS Analytics</p><h1>' + escape_(composition.header.title) + '</h1><div class="meta"><span>Saison : ' +
      escape_(composition.header.season) + "</span>" + (composition.header.course ? "<span>Cours : " +
      escape_(composition.header.course) + "</span>" : "") + '<span class="state">État : ' +
      escape_(composition.state) + "</span></div></header><main>" +
      (composition.sections || []).map(sectionHtml_).join("") + '</main><footer><span>Statistiques agrégées</span><span>' +
      escape_(RULE_VERSION) + "</span></footer></body></html>";
    return {
      report_code: composition.report_code,
      report_type: composition.report_type,
      state: composition.state,
      season: season,
      course: composition.header.course || null,
      file_name: "aks-analytics-" + slug_(season) + "-" + slug_(composition.report_code) + ".html",
      mime_type: MIME_TYPE,
      source_versions: sourceVersions,
      fingerprint: fingerprint_(html),
      html: html
    };
  }

  function build(layout) {
    layout = layout || { compositions: [] };
    var versions = {
      layout: layout.rule_version || null,
      report_content: layout.source_report_rule_version || null,
      chart_model: layout.source_chart_rule_version || null
    };
    var documents = (layout.compositions || []).map(function (composition) {
      return document_(composition, versions, layout.season || "");
    });
    return freeze_({
      rule_version: RULE_VERSION,
      season: layout.season || "",
      mime_type: MIME_TYPE,
      documents: documents
    });
  }

  return Object.freeze({ RULE_VERSION: RULE_VERSION, MIME_TYPE: MIME_TYPE, build: build });
}());
