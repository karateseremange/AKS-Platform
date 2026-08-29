var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ADMIN-006 lot B — injectable adapters without Google resource binding.
 */
function AKS_createPrivateBackendAdapters_(dependencies) {
  dependencies = dependencies || {};

  function fail_(message) {
    var error = new Error(message);
    error.code = "PRIVATE_BACKEND_UNAVAILABLE";
    throw error;
  }

  function configuration(values) {
    values = values || {};
    var snapshot = {
      enabled: values.enabled === true,
      environment: values.environment,
      callerProject: values.callerProject,
      currentSecret: values.currentSecret,
      previousSecret: values.previousSecret,
      backendVersion: values.backendVersion
    };
    return Object.freeze({
      get: function () {
        return {
          enabled: snapshot.enabled,
          environment: snapshot.environment,
          callerProject: snapshot.callerProject,
          currentSecret: snapshot.currentSecret,
          previousSecret: snapshot.previousSecret,
          backendVersion: snapshot.backendVersion
        };
      }
    });
  }

  function logReader(reader) {
    return Object.freeze({
      readRecent: function (query) {
        if (typeof reader !== "function") {
          fail_("Lecteur LOG privé non raccordé.");
        }
        return reader(Object.freeze({
          limit: query.limit,
          severity: query.severity,
          cursor: query.cursor
        }));
      }
    });
  }

  function proofWriter(writer) {
    return Object.freeze({
      write: function (event) {
        if (typeof writer !== "function") {
          fail_("Preuve privée non raccordée.");
        }
        return writer(Object.freeze({
          environment: event.environment,
          command: event.command,
          actorHash: event.actorHash,
          requestId: event.requestId,
          correlationId: event.correlationId,
          result: event.result,
          durationMs: event.durationMs,
          returnedCount: event.returnedCount,
          backendVersion: event.backendVersion
        }));
      }
    });
  }

  return Object.freeze({
    configuration: configuration,
    logReader: logReader,
    proofWriter: proofWriter
  });
}

AKS.Core.PrivateBackendAdapters = Object.freeze({
  create: AKS_createPrivateBackendAdapters_
});
