var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Lightweight dependency container for AKS Platform.
 */
AKS.Core.Container = (function () {
  var definitions = Object.create(null);
  var instances = Object.create(null);

  function register(name, value) {
    validateName_(name);

    if (typeof value === "undefined" || value === null) {
      throw new AKS.Core.Exception(
        "CONTAINER_VALUE_REQUIRED",
        "A value is required for: " + name
      );
    }

    if (has(name)) {
      throw new AKS.Core.Exception(
        "CONTAINER_ENTRY_ALREADY_REGISTERED",
        "Container entry already registered: " + name
      );
    }

    definitions[name] = {
      type: "value",
      value: value,
      singleton: true
    };

    return value;
  }

  function factory(name, resolver, options) {
    validateName_(name);

    if (typeof resolver !== "function") {
      throw new AKS.Core.Exception(
        "CONTAINER_FACTORY_REQUIRED",
        "A factory function is required for: " + name
      );
    }

    if (has(name)) {
      throw new AKS.Core.Exception(
        "CONTAINER_ENTRY_ALREADY_REGISTERED",
        "Container entry already registered: " + name
      );
    }

    definitions[name] = {
      type: "factory",
      resolver: resolver,
      singleton: !options || options.singleton !== false
    };
  }

  function resolve(name) {
    validateName_(name);

    if (!has(name)) {
      throw new AKS.Core.Exception(
        "CONTAINER_ENTRY_NOT_FOUND",
        "Container entry not found: " + name
      );
    }

    var definition = definitions[name];

    if (definition.type === "value") {
      return definition.value;
    }

    if (definition.singleton && Object.prototype.hasOwnProperty.call(instances, name)) {
      return instances[name];
    }

    var instance = definition.resolver(AKS.Core.Container);

    if (typeof instance === "undefined" || instance === null) {
      throw new AKS.Core.Exception(
        "CONTAINER_FACTORY_RETURNED_EMPTY",
        "Factory returned no value for: " + name
      );
    }

    if (definition.singleton) {
      instances[name] = instance;
    }

    return instance;
  }

  function has(name) {
    return Object.prototype.hasOwnProperty.call(definitions, name);
  }

  function remove(name) {
    validateName_(name);

    delete definitions[name];
    delete instances[name];
  }

  function list() {
    return Object.keys(definitions).sort();
  }

  function clear() {
    definitions = Object.create(null);
    instances = Object.create(null);
  }

  function validateName_(name) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new AKS.Core.Exception(
        "CONTAINER_NAME_REQUIRED",
        "Container entry name is required."
      );
    }
  }

  return Object.freeze({
    register: register,
    factory: factory,
    resolve: resolve,
    has: has,
    remove: remove,
    list: list,
    clear: clear
  });
})();
