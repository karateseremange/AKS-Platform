# ADMIN-006 private backend package

This directory contains only the dedicated entry point and manifest. The
PowerShell builder copies the five reviewed private runtime sources from
`src/core/private` into a new local package.

The manifest intentionally contains no `webapp` section. Execution identity
and audience remain D3-D decisions and must not be inferred or installed by
D3-A.

The generated package is inactive unless every required Script Property is
present and `AKS_PRIVATE_ENABLED` is exactly `true`.
