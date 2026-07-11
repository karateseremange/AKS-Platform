var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Standard result object used by AKS Platform.
 */
AKS.Core.Result = Object.freeze({
  success: function (data) {
    return Object.freeze({
      ok: true,
      data: typeof data === "undefined" ? null : data,
      error: null
    });
  },

  failure: function (code, message, details) {
    return Object.freeze({
      ok: false,
      data: null,
      error: Object.freeze({
        code: code || "UNEXPECTED_ERROR",
        message: message || "An unexpected error occurred.",
        details: typeof details === "undefined" ? null : details
      })
    });
  }
});