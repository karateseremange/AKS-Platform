var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Transforme le résultat technique de l'orchestrateur en modèle de restitution.
 * Composant pur : aucun calcul métier, rendu, stockage ou accès externe.
 */
AKS.Analytics.RestitutionModel = (function () {
  "use strict";

  var RULE_VERSION = "analytics-restitution/1.0.0";
  var COURSE_LABELS = Object.freeze({
    BABY: "Baby",
    ENFANT_1: "Enfant 1",
    ENFANT_2: "Enfant 2",
    ADO_ADULTE: "Ado/Adulte",
    FEMININ: "Cours féminin"
  });
  var DISABLED = Object.freeze([
    "IND-REGULARITE-001",
    "IND-STABILITE-001",
    "IND-FIDELITE-001"
  ]);

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function percent_(value) {
    return value === null || typeof value === "undefined" ? null :
      Math.round(value * 1000) / 10;
  }

  function metric_(item) {
    if (!item) {
      return {
        raw_value: null, display_percentage: null, numerator: 0, denominator: 0,
        expected_count: 0, known_count: 0, coverage_rate: null,
        display_coverage_percentage: null, status: "NON_CALCULABLE"
      };
    }
    return {
      raw_value: item.value,
      display_percentage: percent_(item.value),
      numerator: item.numerator,
      denominator: item.denominator,
      expected_count: item.expected_count,
      known_count: item.known_count,
      coverage_rate: item.coverage_rate,
      display_coverage_percentage: percent_(item.coverage_rate),
      status: item.status
    };
  }

  function first_(items) {
    return items && items.length ? items[0] : null;
  }

  function codes_(items) {
    return (items || []).map(function (item) {
      return typeof item === "string" ? item : item.code;
    }).filter(function (code) { return !!code; }).sort();
  }

  function course_(course) {
    var results = course.results || {};
    var aggregates = results.course_aggregates || {};
    var consolidation = course.consolidation || {};
    var diagnostics = course.diagnostics || {};
    return {
      course_code: course.course_code,
      label: COURSE_LABELS[course.course_code] || course.course_code,
      state: course.state,
      available: !!course.exploitable,
      indicators: {
        participation: metric_(first_(aggregates.participation)),
        assiduity: metric_(first_(aggregates.assiduity))
      },
      data_quality: {
        accepted_count: consolidation.accepted_count || 0,
        duplicate_count: consolidation.duplicate_count || 0,
        rejected_count: consolidation.rejected_count || 0,
        warning_codes: codes_(diagnostics.warnings),
        exclusion_codes: codes_(diagnostics.exclusions)
      }
    };
  }

  function global_(orchestration) {
    return (orchestration.global_aggregates || []).map(function (item) {
      return {
        season: item.season,
        indicators: {
          participation: metric_(item.participation),
          assiduity: metric_(item.assiduity)
        }
      };
    }).sort(function (left, right) { return left.season.localeCompare(right.season); });
  }

  function technical_(courses) {
    return courses.map(function (course) {
      var diagnostics = course.diagnostics || {};
      return {
        course_code: course.course_code,
        errors: diagnostics.errors || [],
        warnings: diagnostics.warnings || [],
        exclusions: diagnostics.exclusions || []
      };
    });
  }

  function limits_(orchestration) {
    var limits = [
      { code: "INDICATEURS_NON_CALCULABLES", indicator_ids: DISABLED.slice() },
      { code: "SCORE_AKS_EXCLU" }
    ];
    if (orchestration.season === "2025-2026") {
      limits.push({
        code: "FEMININ_HORS_PERIMETRE_HISTORIQUE",
        message: "Le cours féminin est exclu des statistiques détaillées 2025-2026."
      });
    }
    return limits;
  }

  function build(orchestration) {
    orchestration = orchestration || {};
    var sourceCourses = (orchestration.courses || []).slice().sort(function (left, right) {
      return text_(left.course_code).localeCompare(text_(right.course_code));
    });
    var courses = sourceCourses.map(course_);
    var totals = courses.reduce(function (accumulator, course) {
      accumulator.accepted_count += course.data_quality.accepted_count;
      accumulator.duplicate_count += course.data_quality.duplicate_count;
      accumulator.rejected_count += course.data_quality.rejected_count;
      return accumulator;
    }, { accepted_count: 0, duplicate_count: 0, rejected_count: 0 });

    return freeze_({
      rule_version: RULE_VERSION,
      source_rule_version: orchestration.rule_version || null,
      season: text_(orchestration.season),
      state: orchestration.state || "ERREUR",
      report: {
        summary: {
          expected_course_count: orchestration.summary ? orchestration.summary.expected_count : 0,
          available_course_count: orchestration.summary ? orchestration.summary.exploitable_count : 0,
          failed_course_count: orchestration.summary ? orchestration.summary.failed_count : 0,
          excluded_course_count: orchestration.summary ? orchestration.summary.excluded_count : 0
        },
        courses: courses,
        global: global_(orchestration),
        warnings: courses.reduce(function (all, course) {
          return all.concat(course.data_quality.warning_codes, course.data_quality.exclusion_codes);
        }, []).sort(),
        limits: limits_(orchestration)
      },
      data_quality: {
        accepted_count: totals.accepted_count,
        duplicate_count: totals.duplicate_count,
        rejected_count: totals.rejected_count,
        missing_courses: (orchestration.missing_courses || []).slice().sort(),
        unavailable_courses: courses.filter(function (course) { return !course.available; })
          .map(function (course) { return course.course_code; })
      },
      technical: {
        diagnostics_by_course: technical_(sourceCourses)
      },
      disabled_indicator_ids: DISABLED.slice()
    });
  }

  return Object.freeze({ RULE_VERSION: RULE_VERSION, build: build });
}());
