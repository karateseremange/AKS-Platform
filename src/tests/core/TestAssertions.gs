function assertTrue_(condition, message) {
  if (!condition) throw new Error(message || "Expected condition to be true.");
}
function assertEquals_(expected, actual, message) {
  if (expected !== actual) {
    throw new Error((message || "Values are not equal.") + " Expected: " + expected + ", actual: " + actual);
  }
}
function assertSame_(expected, actual, message) {
  if (expected !== actual) throw new Error(message || "Objects are not identical.");
}
function assertThrows_(callback, expectedCode) {
  try { callback(); } catch (error) {
    if (expectedCode && error.code !== expectedCode) {
      throw new Error("Unexpected error code. Expected: " + expectedCode + ", actual: " + error.code);
    }
    return;
  }
  throw new Error("Expected function to throw.");
}
