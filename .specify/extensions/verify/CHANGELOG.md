# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-28

### Added

- Initial release of the Verify extension
- Command: `/speckit.verify.run` (alias: `/speckit.verify`) — post-implementation verification
- Checks implemented code against spec, plan, tasks, and constitution to catch gaps before review
- Produces a verification report with findings, metrics, and next actions
- `after_implement` hook for automatic verification prompting

### Requirements

- Spec Kit: >=0.1.0
