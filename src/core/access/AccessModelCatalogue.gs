var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/** ACCESS-002-04 closed administration catalogue. */
AKS.Core.AccessModelCatalogue = Object.freeze({
  get: function () {
    function freeze_(value) {
      if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
      Object.keys(value).forEach(function (key) { freeze_(value[key]); });
      return Object.freeze(value);
    }
    return freeze_({
      schemaVersion: "access/1.1",
      readableSchemaVersions: ["access/1.0", "access/1.1"],
      roles: ["ADMINISTRATEUR", "ASSISTANT_AFA", "CONSULTATION", "PROFESSEUR"],
      modules: {
        ATTENDANCE: {
          storageModule: "",
          scope: ["season", "courseCode"],
          capabilities: [
            "COURSE_LIST", "SESSION_LIST", "ATTENDANCE_READ", "SESSION_CREATE",
            "ATTENDANCE_WRITE_DRAFT", "SESSION_CLOSE"
          ]
        },
        ANALYTICS: {
          storageModule: "ANALYTICS", scope: [],
          capabilities: ["ANALYTICS_READ", "ANALYTICS_PREVIEW", "ANALYTICS_PUBLISH"]
        },
        INSCRIPTIONS: {
          storageModule: "INSCRIPTIONS",
          scope: ["season", "section", "courseCode"],
          capabilities: [
            "INSCRIPTIONS_READ", "INSCRIPTIONS_ANALYZE_IMPORT",
            "INSCRIPTIONS_CONTROL", "INSCRIPTIONS_WRITE",
            "INSCRIPTIONS_APPLY_IMPORT", "INSCRIPTIONS_ACTIVATE"
          ]
        },
        ACCESS: {
          storageModule: "ACCESS", scope: [], capabilities: ["ACCESS_MANAGE"]
        }
      }
    });
  }
});
