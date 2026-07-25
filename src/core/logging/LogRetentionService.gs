/**
 * Creates the LOG-001 retention service for ordinary platform logs.
 *
 * Audit evidence remains outside this service and follows AUDIT-001.
 *
 * @param {Object} repository
 * @param {Object} configurationService
 * @param {Object} logger
 * @param {Object=} options
 * @returns {Object}
 */
function AKS_createLogRetentionService_(
  repository,
  configurationService,
  logger,
  options
) {
  options = options || {};
  var clock = options.clock || function () { return new Date(); };
  var batchSize = options.batchSize || 500;
  var dayMs = 24 * 60 * 60 * 1000;

  function error_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function retentionDays_() {
    var resolved = configurationService.resolve("logging.retentionDays");
    var days = resolved.value;
    if (
      typeof days !== "number" ||
      !isFinite(days) ||
      Math.floor(days) !== days ||
      days < 1 ||
      days > 3650
    ) {
      throw error_(
        "LOG001_RETENTION_DAYS_INVALID",
        "La durée de conservation doit être comprise entre 1 et 3650 jours."
      );
    }
    return days;
  }

  function purge(context) {
    context = context || {};
    var now = clock();
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw error_(
        "LOG001_RETENTION_CLOCK_INVALID",
        "La date d'exécution de la purge est invalide."
      );
    }

    var days = retentionDays_();
    var cutoff = new Date(now.getTime() - days * dayMs);
    var deletedRows = repository.purgeBefore(cutoff, batchSize);
    var report = Object.freeze({
      retentionDays: days,
      cutoff: cutoff.toISOString(),
      deletedRows: deletedRows,
      completedAt: now.toISOString()
    });

    logger.emit({
      level: "INFO",
      category: "administration",
      source: "AKS.LogRetention",
      module: "core",
      eventType: "logging.retention.purge.completed",
      message: "Purge contrôlée des journaux terminée.",
      outcome: "success",
      actor: {
        type: context.actorType || "service",
        id: context.actor || "aks-platform"
      },
      correlationId: context.correlationId,
      durationMs: null,
      context: {
        retentionDays: report.retentionDays,
        cutoff: report.cutoff,
        deletedRows: report.deletedRows
      }
    });

    return report;
  }

  return Object.freeze({ purge: purge });
}
