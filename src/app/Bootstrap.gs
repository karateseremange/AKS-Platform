function AKS_start() {
  try {
    return AKS.Core.Application.start();
  } catch (error) {
    AKS.Core.Logger.error("AKS Platform startup failed.", error);
    return AKS.Core.Result.failure(
      error && error.code ? error.code : "STARTUP_FAILED",
      error && error.message ? error.message : String(error)
    );
  }
}
