var AKS = AKS || {};
AKS.Core = AKS.Core || {};

AKS.Core.Modules = (function () {
  var modules = Object.create(null);

  function register(descriptor) {
    validateDescriptor_(descriptor);

    if (has(descriptor.id)) {
      throw new AKS.Core.Exception(
        "MODULE_ALREADY_REGISTERED",
        "Module already registered: " + descriptor.id
      );
    }

    var normalized = Object.freeze({
      id: descriptor.id,
      name: descriptor.name,
      version: descriptor.version || "0.1.0",
      status: descriptor.status || "planned"
    });

    modules[normalized.id] = normalized;
    return normalized;
  }

  function get(id) {
    validateId_(id);

    if (!has(id)) {
      throw new AKS.Core.Exception(
        "MODULE_NOT_FOUND",
        "Module not found: " + id
      );
    }

    return modules[id];
  }

  function has(id) {
    return Object.prototype.hasOwnProperty.call(modules, id);
  }

  function list() {
    return Object.keys(modules).sort().map(function (id) {
      return modules[id];
    });
  }

  function clear() {
    modules = Object.create(null);
  }

  function validateDescriptor_(descriptor) {
    if (!descriptor || typeof descriptor !== "object") {
      throw new AKS.Core.Exception(
        "MODULE_DESCRIPTOR_REQUIRED",
        "Module descriptor is required."
      );
    }

    validateId_(descriptor.id);

    if (typeof descriptor.name !== "string" || descriptor.name.trim() === "") {
      throw new AKS.Core.Exception(
        "MODULE_NAME_REQUIRED",
        "Module name is required."
      );
    }
  }

  function validateId_(id) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new AKS.Core.Exception(
        "MODULE_ID_REQUIRED",
        "Module id is required."
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
