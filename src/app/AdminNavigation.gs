var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * ADMIN-002 declarative administrative navigation.
 *
 * Destinations are supplied by Core services or active modules. This
 * component only validates, filters, orders and resolves those declarations.
 */
function AKS_createAdminNavigation_(options) {
  options = options || {};
  var FAMILY_ORDER = ["administration", "modules", "maintenance"];
  var FAMILY_LABELS = {
    administration: "Administration",
    modules: "Modules",
    maintenance: "Maintenance"
  };

  function isNonEmptyString_(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  function copy_(value) {
    if (Array.isArray(value)) {
      return value.map(copy_);
    }
    if (value && typeof value === "object") {
      var result = {};
      Object.keys(value).forEach(function (key) {
        result[key] = copy_(value[key]);
      });
      return result;
    }
    return value;
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

  function resolveTarget_(entry, baseUrl) {
    if (entry.external === true) {
      return /^https:\/\//.test(entry.target) ? entry.target : null;
    }
    if (!baseUrl || !/^[?#]/.test(entry.target)) {
      return null;
    }
    return baseUrl + entry.target;
  }

  function normalizeEntry_(entry, baseUrl) {
    if (
      !entry ||
      !isNonEmptyString_(entry.id) ||
      !isNonEmptyString_(entry.label) ||
      FAMILY_ORDER.indexOf(entry.family) === -1 ||
      !isNonEmptyString_(entry.target) ||
      entry.available !== true ||
      entry.authorized === false
    ) {
      return null;
    }

    var resolvedTarget = resolveTarget_(entry, baseUrl);
    if (!resolvedTarget) {
      return null;
    }

    return {
      id: entry.id,
      label: entry.label,
      family: entry.family,
      target: resolvedTarget,
      external: entry.external === true,
      priority: typeof entry.priority === "number" ? entry.priority : 100,
      quickAction: entry.quickAction === true
    };
  }

  function build(entries, baseUrl) {
    var seen = {};
    var destinations = (Array.isArray(entries) ? entries : [])
      .map(function (entry) {
        return normalizeEntry_(entry, baseUrl);
      })
      .filter(function (entry) {
        if (!entry || seen[entry.id]) {
          return false;
        }
        seen[entry.id] = true;
        return true;
      })
      .sort(function (left, right) {
        var familyDifference =
          FAMILY_ORDER.indexOf(left.family) -
          FAMILY_ORDER.indexOf(right.family);
        if (familyDifference !== 0) {
          return familyDifference;
        }
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }
        return left.id < right.id ? -1 : (left.id > right.id ? 1 : 0);
      });

    var families = FAMILY_ORDER.map(function (familyId) {
      return {
        id: familyId,
        label: FAMILY_LABELS[familyId],
        destinations: destinations.filter(function (destination) {
          return destination.family === familyId;
        }).map(copy_)
      };
    }).filter(function (family) {
      return family.destinations.length > 0;
    });

    return deepFreeze_({
      currentSection: "control-center",
      home: {
        label: "Centre de pilotage",
        target: baseUrl ? baseUrl + "?app=admin" : null
      },
      families: families,
      quickActions: destinations.filter(function (destination) {
        return destination.quickAction;
      }).map(copy_)
    });
  }

  return Object.freeze({
    build: build
  });
}

AKS.Admin.Navigation = Object.freeze({
  getModel: function (baseUrl) {
    var entries = [];
    var modules = AKS.App &&
      AKS.App.Bootstrap &&
      typeof AKS.App.Bootstrap.getModules === "function"
      ? AKS.App.Bootstrap.getModules()
      : [];

    modules.forEach(function (moduleDefinition) {
      var descriptor = moduleDefinition &&
        typeof moduleDefinition.getDescriptor === "function"
        ? moduleDefinition.getDescriptor()
        : null;
      if (
        descriptor &&
        descriptor.status === "active" &&
        typeof moduleDefinition.getAdminNavigationEntries === "function"
      ) {
        entries = entries.concat(
          moduleDefinition.getAdminNavigationEntries()
        );
      }
    });

    return AKS_createAdminNavigation_().build(entries, baseUrl);
  }
});
