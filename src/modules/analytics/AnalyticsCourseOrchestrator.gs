var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Orchestre la chaîne Analytics indépendamment pour chaque cours.
 * Composant pur : aucune lecture externe, persistance ou mutation des entrées.
 */
AKS.Analytics.CourseOrchestrator = (function () {
  "use strict";

  var MODEL = AKS.Analytics.NormalizedModel;
  var RULE_VERSION = "analytics-orchestration/1.0.0";

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function clone_(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function diagnostic_(code, courseCode, details) {
    return { code: code, course_code: courseCode || null, details: details || null };
  }

  function normalizeCourseSource_(source, defaultSeason) {
    source = source || {};
    var season = text_(source.season || defaultSeason);
    var code = text_(source.code || source.course_code).toUpperCase();
    var errors = [];
    var warnings = clone_(source.warnings || []);
    var exclusions = clone_(source.exclusions || []);
    var normalized = [];
    var courseResult = AKS.Analytics.Normalizer.normalizeCourse({ season: season, code: code });

    errors = errors.concat(courseResult.errors || []);
    warnings = warnings.concat(courseResult.warnings || []);
    exclusions = exclusions.concat(courseResult.exclusions || []);
    if (!courseResult.value) {
      return {
        season: season, code: code, attendances: [], members: clone_(source.members || []),
        diagnostics: { errors: errors, warnings: warnings, exclusions: exclusions },
        excluded: exclusions.length > 0
      };
    }

    (source.attendances || []).forEach(function (row, index) {
      var status = AKS.Analytics.Normalizer.normalizeAttendanceStatus(row.status);
      var session = AKS.Analytics.Normalizer.normalizeSession({
        status: row.session_status || MODEL.SESSION_STATUS.REALISEE
      });
      var rowErrors = (status.errors || []).concat(session.errors || []);
      warnings = warnings.concat(status.warnings || [], session.warnings || []);
      exclusions = exclusions.concat(session.exclusions || []);

      if (rowErrors.length) {
        rowErrors.forEach(function (codeValue) {
          errors.push(diagnostic_(codeValue, code, { source_index: index }));
        });
        return;
      }
      if (!session.value || !session.value.included) return;

      normalized.push({
        season: season,
        course_code: code,
        session_date: text_(row.session_date),
        licencie_id: text_(row.licencie_id),
        status: status.value,
        session_status: MODEL.SESSION_STATUS.REALISEE
      });
    });

    return {
      season: season, code: code, attendances: normalized, members: clone_(source.members || []),
      diagnostics: { errors: errors, warnings: warnings, exclusions: exclusions },
      excluded: false
    };
  }

  function isCalculable_(indicators) {
    return indicators.course_aggregates.participation.concat(
      indicators.course_aggregates.assiduity
    ).some(function (item) { return item.status !== "NON_CALCULABLE"; });
  }

  function courseState_(consolidated, indicators) {
    if (!isCalculable_(indicators)) return MODEL.DATASET_STATE.ERREUR;
    if (consolidated.state !== MODEL.DATASET_STATE.VALIDE ||
        indicators.course_aggregates.participation.concat(
          indicators.course_aggregates.assiduity
        ).some(function (item) { return item.status !== "VALIDE"; })) {
      return MODEL.DATASET_STATE.PARTIEL;
    }
    return MODEL.DATASET_STATE.VALIDE;
  }

  function processCourse_(source, defaultSeason) {
    var prepared = normalizeCourseSource_(source, defaultSeason);
    if (prepared.excluded) {
      return {
        course_code: prepared.code,
        season: prepared.season,
        state: "EXCLU",
        exploitable: false,
        results: null,
        consolidation: null,
        diagnostics: prepared.diagnostics
      };
    }

    var consolidated = AKS.Analytics.Consolidator.consolidate({
      attendances: prepared.attendances,
      members: prepared.members,
      warnings: prepared.diagnostics.warnings,
      exclusions: prepared.diagnostics.exclusions
    });
    var indicators = AKS.Analytics.IndicatorEngine.calculate({
      attendances: consolidated.accepted
    });
    var diagnostics = {
      errors: prepared.diagnostics.errors.concat(consolidated.diagnostics.errors),
      warnings: consolidated.diagnostics.warnings.slice(),
      exclusions: consolidated.diagnostics.exclusions.concat(indicators.exclusions || [])
    };
    var state = courseState_(consolidated, indicators);
    if (prepared.diagnostics.errors.length && state === MODEL.DATASET_STATE.VALIDE) {
      state = MODEL.DATASET_STATE.PARTIEL;
    }

    return {
      course_code: prepared.code,
      season: prepared.season,
      state: state,
      exploitable: state !== MODEL.DATASET_STATE.ERREUR,
      results: indicators,
      consolidation: {
        accepted_count: consolidated.accepted.length,
        duplicate_count: consolidated.duplicates.length,
        rejected_count: consolidated.rejected.length
      },
      diagnostics: diagnostics
    };
  }

  function aggregateIndicator_(items, indicatorId, season) {
    var numerator = 0;
    var denominator = 0;
    var expected = 0;
    var known = 0;
    var partial = false;
    items.forEach(function (item) {
      numerator += item.numerator;
      denominator += item.denominator;
      expected += item.expected_count;
      known += item.known_count;
      partial = partial || item.status !== "VALIDE";
    });
    return {
      indicator_id: indicatorId,
      rule_version: items.length ? items[0].rule_version : null,
      scope_type: "GLOBAL",
      scope_id: season,
      season: season,
      value: denominator ? numerator / denominator : null,
      numerator: numerator,
      denominator: denominator,
      expected_count: expected,
      known_count: known,
      coverage_rate: expected ? known / expected : null,
      status: !denominator ? "NON_CALCULABLE" : (partial || known < expected ? "PARTIEL" : "VALIDE")
    };
  }

  function globalAggregates_(courses) {
    var bySeason = {};
    courses.filter(function (course) { return course.exploitable; }).forEach(function (course) {
      bySeason[course.season] = bySeason[course.season] || { participation: [], assiduity: [] };
      bySeason[course.season].participation = bySeason[course.season].participation.concat(
        course.results.course_aggregates.participation
      );
      bySeason[course.season].assiduity = bySeason[course.season].assiduity.concat(
        course.results.course_aggregates.assiduity
      );
    });
    return Object.keys(bySeason).sort().map(function (season) {
      return {
        season: season,
        participation: aggregateIndicator_(
          bySeason[season].participation, "IND-PARTICIPATION-001", season
        ),
        assiduity: aggregateIndicator_(
          bySeason[season].assiduity, "IND-ASSIDUITE-001", season
        )
      };
    });
  }

  function run(input) {
    input = input || {};
    var sources = (input.courses || []).slice().sort(function (left, right) {
      return text_(left.code || left.course_code).localeCompare(text_(right.code || right.course_code));
    });
    var expected = (input.expected_courses || sources.map(function (source) {
      return text_(source.code || source.course_code).toUpperCase();
    })).map(function (code) { return text_(code).toUpperCase(); }).sort();
    var seen = {};
    var courses = sources.map(function (source) {
      var result;
      try {
        result = processCourse_(source, input.season);
      } catch (error) {
        result = {
          course_code: text_(source.code || source.course_code).toUpperCase(),
          season: text_(source.season || input.season),
          state: MODEL.DATASET_STATE.ERREUR,
          exploitable: false,
          results: null,
          consolidation: null,
          diagnostics: {
            errors: [diagnostic_("ERREUR_ORCHESTRATION_COURS", text_(source.code || source.course_code).toUpperCase(), {
              message: error && error.message ? error.message : String(error)
            })],
            warnings: [],
            exclusions: []
          }
        };
      }
      seen[result.course_code] = true;
      return result;
    });

    var missing = expected.filter(function (code) { return !seen[code]; });
    missing.forEach(function (code) {
      courses.push({
        course_code: code,
        season: text_(input.season),
        state: MODEL.DATASET_STATE.ERREUR,
        exploitable: false,
        results: null,
        consolidation: null,
        diagnostics: {
          errors: [diagnostic_("COURS_ATTENDU_ABSENT", code)],
          warnings: [],
          exclusions: []
        }
      });
    });
    courses.sort(function (left, right) { return left.course_code.localeCompare(right.course_code); });

    var exploitableCount = courses.filter(function (course) { return course.exploitable; }).length;
    var state = !exploitableCount ? MODEL.DATASET_STATE.ERREUR :
      (courses.some(function (course) { return course.state !== MODEL.DATASET_STATE.VALIDE; }) ?
        MODEL.DATASET_STATE.PARTIEL : MODEL.DATASET_STATE.VALIDE);

    return freeze_({
      rule_version: RULE_VERSION,
      season: text_(input.season),
      state: state,
      expected_courses: expected,
      missing_courses: missing,
      courses: courses,
      global_aggregates: globalAggregates_(courses),
      summary: {
        expected_count: expected.length,
        received_count: sources.length,
        exploitable_count: exploitableCount,
        failed_count: courses.filter(function (course) {
          return course.state === MODEL.DATASET_STATE.ERREUR;
        }).length,
        excluded_count: courses.filter(function (course) { return course.state === "EXCLU"; }).length
      }
    });
  }

  return Object.freeze({ run: run });
}());
