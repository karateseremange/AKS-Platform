# AKS.Logger

## Role

`AKS.Logger` is the transversal logging component of AKS Core.

This directory currently contains only the technical structure prepared by
`US-LOG-001`. No public contract, internal contract, logging algorithm,
provider behavior, or integration behavior is implemented at this stage.

## Structure

```text
src/core/logger/
├── Logger.js
├── LoggerService.js
├── LoggerProvider.js
├── AppsScriptLoggerProvider.js
├── MemoryLoggerProvider.js
├── FailingLoggerProvider.js
└── README.md
```

## File responsibilities

| File | Architectural responsibility |
| --- | --- |
| `Logger.js` | Public API namespace placeholder |
| `LoggerService.js` | Internal orchestration service placeholder |
| `LoggerProvider.js` | Common provider contract placeholder |
| `AppsScriptLoggerProvider.js` | Google Apps Script provider placeholder |
| `MemoryLoggerProvider.js` | In-memory validation provider placeholder |
| `FailingLoggerProvider.js` | Controlled provider-failure placeholder |
| `README.md` | Local structural documentation |

The listed files are specific to `AKS.Logger`. They are an application of
`ARCH-CORE-001`, not a mandatory file set for other AKS Core components.

## Runtime convention

The component uses the global `AKS` namespace supported directly by Google Apps
Script:

```javascript
var AKS = AKS || {};
```

No ES Module declaration (`import` or `export`) is used. The files can therefore
be added to the Apps Script source tree without a bundling or compilation step.

## Project Book references

- `ARCH-CORE-001` — Standard des composants transversaux
- `LOG-001` — Logging policy
- `LOG-SPEC-001` — Public logging contract
- `LOG-DESIGN-001` — Logger design
- `LOG-TEST-001` — Logger validation strategy
- `GOV-DEV-001` — Development governance

## User Story status

| User Story | Value | Status |
| --- | --- | --- |
| `US-LOG-001` | Structure | In review |
| `US-LOG-002` | Internal contracts | Not started |
| `US-LOG-003` | Validation infrastructure | Not started |
| `US-LOG-004` | Behavior | Not started |
| `US-LOG-005` | Automated tests | Not started |
| `US-LOG-006` | Integration | Not started |

## Current exclusions

The following elements are explicitly outside the scope of `US-LOG-001`:

- public method signatures;
- internal method signatures;
- provider method signatures;
- log levels and constants;
- event or context structures;
- validation rules;
- logging algorithms;
- provider selection or instantiation;
- calls to Google Apps Script services;
- automated test implementations;
- integration with existing AKS Platform modules.

These elements must be introduced only by their designated User Stories.
