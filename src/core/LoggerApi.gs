var AKS = AKS || {};

/**
 * Creates the LOG-001 structured logging service.
 *
 * @param {Function} eventProvider
 * @param {Object=} options
 * @returns {Object}
 */
function AKS_createLoggingService_(eventProvider, options) {
  options = options || {};
  var clock = options.clock || function () { return new Date(); };
  var idProvider = options.idProvider || function () {
    return Utilities.getUuid();
  };
  var environment = String(options.environment || "production");
  var levels = ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"];
  var categories = [
    "technical", "security", "administration", "functional", "integration"
  ];
  var sensitiveKeyPattern = /(password|secret|token|authorization|cookie|signature|medical|healthanswers?|questionnaireanswers?|responses?)/i;

  function clone_(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(clone_);
    }
    var copy = {};
    Object.keys(value).forEach(function (key) {
      copy[key] = clone_(value[key]);
    });
    return copy;
  }

  function sanitize_(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(sanitize_);
    }
    var safe = {};
    Object.keys(value).forEach(function (key) {
      safe[key] = sensitiveKeyPattern.test(key)
        ? "[MASQUÉ]"
        : sanitize_(value[key]);
    });
    return safe;
  }

  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze_(value[key]);
    });
    return Object.freeze(value);
  }

  function requiredString_(value, code, label) {
    var normalized = String(value || "").trim();
    if (!normalized) {
      var error = new Error(label + " est obligatoire.");
      error.code = code;
      throw error;
    }
    return normalized;
  }

  function correlationId_(candidate) {
    var normalized = String(candidate || "").trim();
    if (normalized && /^[A-Za-z0-9._:-]{8,100}$/.test(normalized)) {
      return normalized;
    }
    return "corr-" + idProvider();
  }

  function emit(event) {
    event = event || {};
    var level = requiredString_(
      event.level, "LOG001_LEVEL_REQUIRED", "Le niveau"
    ).toUpperCase();
    var category = requiredString_(
      event.category, "LOG001_CATEGORY_REQUIRED", "La catégorie"
    ).toLowerCase();

    if (levels.indexOf(level) === -1) {
      var levelError = new Error("Niveau de journalisation inconnu : " + level);
      levelError.code = "LOG001_INVALID_LEVEL";
      throw levelError;
    }
    if (categories.indexOf(category) === -1) {
      var categoryError = new Error("Catégorie de journalisation inconnue : " + category);
      categoryError.code = "LOG001_INVALID_CATEGORY";
      throw categoryError;
    }

    var entry = deepFreeze_({
      schemaVersion: "1.0",
      eventId: "evt-" + idProvider(),
      timestamp: clock().toISOString(),
      environment: environment,
      correlationId: correlationId_(event.correlationId),
      level: level,
      category: category,
      source: requiredString_(
        event.source, "LOG001_SOURCE_REQUIRED", "La source"
      ),
      module: event.module ? String(event.module) : null,
      eventType: requiredString_(
        event.eventType, "LOG001_EVENT_TYPE_REQUIRED", "Le type d'événement"
      ),
      message: requiredString_(
        event.message, "LOG001_MESSAGE_REQUIRED", "Le message"
      ),
      outcome: event.outcome ? String(event.outcome) : null,
      actor: event.actor ? sanitize_(clone_(event.actor)) : null,
      reference: event.reference ? String(event.reference) : null,
      durationMs: typeof event.durationMs === "number" ? event.durationMs : null,
      context: sanitize_(clone_(event.context || {}))
    });

    try {
      eventProvider(entry);
      return Object.freeze({ ok: true, event: entry });
    } catch (providerError) {
      console.error("[LOG001_PROVIDER_FAILURE] " + String(
        providerError && providerError.message
          ? providerError.message
          : providerError
      ));
      return Object.freeze({
        ok: false,
        event: entry,
        errorCode: "LOG001_PROVIDER_FAILURE"
      });
    }
  }

  return Object.freeze({
    emit: emit,
    sanitize: function (value) {
      return deepFreeze_(sanitize_(clone_(value)));
    }
  });
}

/**
 * Builds the stable public logging API used by existing components.
 *
 * @param {Function|Object} providerOrService
 * @returns {Object}
 */
function AKS_createLoggerApi_(providerOrService) {
  var service = providerOrService &&
    typeof providerOrService.emit === "function"
    ? providerOrService
    : AKS_createLoggingService_(function (entry) {
        if (typeof providerOrService === "function") {
          providerOrService(entry.level, entry.message, entry.context, entry);
        }
      });

  function emit_(level, message, context) {
    context = context || {};
    return service.emit({
      level: level,
      category: context.category || "technical",
      source: context.source || "AKS.Platform",
      module: context.module || null,
      eventType: context.eventType || "platform.message",
      message: message,
      outcome: context.outcome || null,
      correlationId: context.correlationId || context.requestId || null,
      actor: context.actor || (context.user
        ? { type: "user", id: context.user }
        : null),
      reference: context.reference || null,
      durationMs: context.durationMs,
      context: context
    });
  }

  return Object.freeze({
    debug: function (message, context) { return emit_("DEBUG", message, context); },
    info: function (message, context) { return emit_("INFO", message, context); },
    warn: function (message, context) { return emit_("WARN", message, context); },
    error: function (message, context) { return emit_("ERROR", message, context); },
    critical: function (message, context) {
      return emit_("CRITICAL", message, context);
    },
    emit: function (event) { return service.emit(event); }
  });
}

AKS.LogEventRepository = AKS_createDefaultLogEventRepository_();

AKS.Logging = AKS_createLoggingService_(function (entry) {
  AKS.LogEventRepository.append(entry);
  Logger.log(JSON.stringify(entry));
});

AKS.Logger = AKS_createLoggerApi_(AKS.Logging);
