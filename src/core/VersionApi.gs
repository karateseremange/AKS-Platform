var AKS = AKS || {};

/**
 * Official release metadata for AKS Platform.
 *
 * These values are maintained exclusively by the platform release process
 * and must never be modified at runtime.
 */
var AKS_RELEASE_INFO_ = Object.freeze({
  version: "1.4.1",
  build: "20260827.1",
  releaseName: "ACCESS et administration sécurisée — correctif d’attribution"
});

/**
 * Builds the public release metadata API.
 *
 * The provider remains internal so the metadata source may later be replaced
 * by a build or publication process without changing the public AKS.Version
 * API.
 *
 * @param {Function} releaseProvider
 * @returns {Object}
 */
function AKS_createVersionApi_(releaseProvider) {
  function releaseMetadataError_(message) {
    var error = new Error(message);
    error.code = "VERSION001_INVALID_RELEASE_METADATA";
    return error;
  }

  function validateReleaseProvider_() {
    if (typeof releaseProvider !== "function") {
      throw releaseMetadataError_(
        "Le fournisseur des métadonnées de release doit être une fonction."
      );
    }
  }

  function normalizeRequiredString_(value, propertyName) {
    if (typeof value !== "string" || !value.trim()) {
      throw releaseMetadataError_(
        "La métadonnée de release '" + propertyName + "' est absente ou invalide."
      );
    }

    return value.trim();
  }

  function validateReleaseInfo_(releaseInfo) {
    if (!releaseInfo || typeof releaseInfo !== "object" || Array.isArray(releaseInfo)) {
      throw releaseMetadataError_(
        "Le fournisseur doit retourner un objet de métadonnées de release valide."
      );
    }

    return {
      version: normalizeRequiredString_(releaseInfo.version, "version"),
      build: normalizeRequiredString_(releaseInfo.build, "build"),
      releaseName: normalizeRequiredString_(releaseInfo.releaseName, "releaseName")
    };
  }

  function getReleaseInfo() {
    validateReleaseProvider_();

    var releaseInfo = validateReleaseInfo_(releaseProvider());

    return Object.freeze({
      version: releaseInfo.version,
      build: releaseInfo.build,
      releaseName: releaseInfo.releaseName
    });
  }

  return Object.freeze({
    getReleaseInfo: getReleaseInfo
  });
}

AKS.Version = AKS_createVersionApi_(function () {
  return AKS_RELEASE_INFO_;
});
