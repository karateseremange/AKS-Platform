/**
 * Verifies the platform release contract.
 */
function test_PlatformVersion_returnsExpectedReleaseInfo() {
  var releaseInfo = AKS.Version.getReleaseInfo();

  if (releaseInfo.version !== "1.1.0-dev") {
    throw new Error("Unexpected platform version: " + releaseInfo.version);
  }

  if (releaseInfo.codename !== "Consolidation") {
    throw new Error("Unexpected platform codename: " + releaseInfo.codename);
  }
}

/**
 * Verifies that consumers cannot mutate the internal release metadata.
 */
function test_PlatformVersion_doesNotExposeMutableState() {
  var first = AKS.Version.getReleaseInfo();

  try {
    first.version = "9.9.9";
    first.codename = "Altered";
  } catch (error) {
    // Object.freeze may throw depending on the runtime mode.
  }

  var second = AKS.Version.getReleaseInfo();

  if (second.version !== "1.1.0-dev") {
    throw new Error("Platform version was mutated.");
  }

  if (second.codename !== "Consolidation") {
    throw new Error("Platform codename was mutated.");
  }

  if (first === second) {
    throw new Error("Release information must be returned as a defensive copy.");
  }
}
