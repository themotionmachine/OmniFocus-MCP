# Changelog

All notable changes to the Cleanup extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-22

### Added

- Initial release of the Cleanup extension
- Post-implementation quality gate command (`/speckit.cleanup.run`)
- Issue detection by severity (CRITICAL, LARGE, MEDIUM, SMALL)
- Scout Rule implementation for small issues (auto-fix with confirmation)
- Tech debt task creation for medium issues
- Tech debt report generation for large issues
- Constitution validation for all cleanup actions
- Linter and test runner integration
- `after_implement` hook for automatic cleanup prompting
- Alias support (`/speckit.cleanup` → `/speckit.cleanup.run`)
- Configuration template for customization
