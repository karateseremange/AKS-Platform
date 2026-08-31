# ADMIN-006 private backend package

This directory contains only the dedicated entry point and manifest. The
PowerShell builder copies the five reviewed private runtime sources from
`src/core/private` into a new local package.

The D3-D manifest defines the reviewed RECETTE Web App boundary:

- `access: ANYONE_ANONYMOUS` for server-to-server invocation without a
  Google user session;
- `executeAs: USER_DEPLOYING` so Google resource access uses the deploying
  owner's identity.

The builder rejects any manifest field, runtime setting, audience or execution
identity that differs from this contract.

The generated package remains inactive unless every required Script Property
is present and `AKS_PRIVATE_ENABLED` is exactly `true`. Manifest presence
does not authorize a push, version, deployment or activation.
