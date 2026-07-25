var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Composes the ADMIN-003 functional presentation model.
 *
 * The composer groups already validated widgets without interpreting their
 * business content or deriving a global health state.
 *
 * @returns {Object}
 */
function AKS_createDashboardComposer_() {
  var ZONES = ["header", "summary", "modules", "quick-actions"];

  function createZones_() {
    return {
      header: [],
      summary: [],
      modules: [],
      quickActions: []
    };
  }

  function zoneProperty_(zone) {
    return zone === "quick-actions" ? "quickActions" : zone;
  }

  function copyDeclarative_(value) {
    if (Array.isArray(value)) {
      return value.map(copyDeclarative_);
    }
    if (value && typeof value === "object") {
      var copy = {};
      Object.keys(value).forEach(function (key) {
        copy[key] = copyDeclarative_(value[key]);
      });
      return copy;
    }
    return value;
  }

  function copyWidget_(widget) {
    return copyDeclarative_(widget);
  }

  function compose(options) {
    options = options || {};
    var zones = createZones_();
    var widgets = Array.isArray(options.widgets) ? options.widgets : [];

    widgets.forEach(function (widget) {
      var propertyName = zoneProperty_(widget.zone);
      if (Object.prototype.hasOwnProperty.call(zones, propertyName)) {
        zones[propertyName].push(copyWidget_(widget));
      }
    });

    return {
      application: {
        name: "AKS Platform"
      },
      context: {
        currentUser: options.currentUser || null
      },
      zoneOrder: ZONES.slice(),
      zones: zones,
      widgets: widgets.map(copyWidget_)
    };
  }

  return Object.freeze({
    compose: compose
  });
}

AKS.Core.DashboardComposer = AKS_createDashboardComposer_();
