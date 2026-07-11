function test_Container_registerAndResolveValue() {
  AKS.Core.Container.clear();

  var service = { value: 42 };
  AKS.Core.Container.register("sample", service);

  assertTrue_(
    AKS.Core.Container.has("sample"),
    "Container entry should exist."
  );

  assertSame_(
    service,
    AKS.Core.Container.resolve("sample"),
    "Registered value should be resolved."
  );
}

function test_Container_resolvesSingletonFactoryOnce() {
  AKS.Core.Container.clear();

  var calls = 0;

  AKS.Core.Container.factory(
    "sampleFactory",
    function () {
      calls += 1;
      return { id: calls };
    }
  );

  var first = AKS.Core.Container.resolve("sampleFactory");
  var second = AKS.Core.Container.resolve("sampleFactory");

  assertSame_(
    first,
    second,
    "Singleton factory should return the same instance."
  );

  assertEquals_(
    1,
    calls,
    "Singleton factory should be called once."
  );
}

function test_Container_resolvesTransientFactoryEachTime() {
  AKS.Core.Container.clear();

  var calls = 0;

  AKS.Core.Container.factory(
    "transientFactory",
    function () {
      calls += 1;
      return { id: calls };
    },
    { singleton: false }
  );

  var first = AKS.Core.Container.resolve("transientFactory");
  var second = AKS.Core.Container.resolve("transientFactory");

  assertTrue_(
    first !== second,
    "Transient factory should return different instances."
  );

  assertEquals_(
    2,
    calls,
    "Transient factory should be called for each resolution."
  );
}

function test_Container_rejectsDuplicateEntry() {
  AKS.Core.Container.clear();
  AKS.Core.Container.register("sample", {});

  assertThrows_(
    function () {
      AKS.Core.Container.register("sample", {});
    },
    "CONTAINER_ENTRY_ALREADY_REGISTERED"
  );
}

function test_Container_rejectsUnknownEntry() {
  AKS.Core.Container.clear();

  assertThrows_(
    function () {
      AKS.Core.Container.resolve("missing");
    },
    "CONTAINER_ENTRY_NOT_FOUND"
  );
}

function test_ServiceRegistry_usesContainerFacade() {
  AKS.Core.Container.clear();

  var logger = { info: function () {} };
  AKS.Core.Services.register("logger", logger);

  assertSame_(
    logger,
    AKS.Core.Container.resolve("logger"),
    "Service registry should use the container."
  );

  assertSame_(
    logger,
    AKS.Core.Services.get("logger"),
    "Service registry facade should resolve the same value."
  );
}
