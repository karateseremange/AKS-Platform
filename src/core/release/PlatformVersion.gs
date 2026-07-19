var AKS = AKS || {};

/**
 * Exposes immutable AKS Platform release metadata.
 */
AKS.Version = (function () {
  var RELEASE_INFO = Object.freeze({
    version: "1.1.0-dev",
    codename: "Consolidation"
  });

  function getReleaseInfo() {
    return Object.freeze({
      version: RELEASE_INFO.version,
      codename: RELEASE_INFO.codename
    });
  }

  return Object.freeze({
    getReleaseInfo: getReleaseInfo
  });
})();
