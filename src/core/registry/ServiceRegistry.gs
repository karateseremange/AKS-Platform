var AKS = AKS || {};
AKS.Core = AKS.Core || {};

AKS.Core.Services = (function () {
  var services = Object.create(null);

  function register(name, service) {
    validateName_(name);

    if (service === null || typeof service === "undefined") {
      throw new AKS.Core.Exception(
        "SERVICE_REQUIRED",
        "A service instance is required for: " + name
      );
    }

    if (has(name)) {
      throw new AKS.Core.Exception(
        "SERVICE_ALREADY_REGISTERED",
        "Service already registered: " + name
      );
    }

    services[name] = service;
    return service;
  }

  function get(name) {
    validateName_(name);

    if (!has(name)) {
      throw new AKS.Core.Exception(
        "SERVICE_NOT_FOUND",
        "Service not found: " + name
      );
    }

    return services[name];
  }

  function has(name) {
    return Object.prototype.hasOwnProperty.call(services, name);
  }

  function list() {
    return Object.keys(services).sort();
  }

  function clear() {
    services = Object.create(null);
  }

  function validateName_(name) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new AKS.Core.Exception(
        "SERVICE_NAME_REQUIRED",
        "Service name is required."
      );
    }
  }

  return Object.freeze({
    register: register,
    get: get,
    has: has,
    list: list,
    clear: clear
  });
})();
