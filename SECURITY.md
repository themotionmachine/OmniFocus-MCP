# Security Policy

## Security Model

OmniFocus MCP Server operates **locally** on your macOS machine:

- Executes JXA scripts via `osascript` to interact with OmniFocus
- Requires macOS Automation permissions for OmniFocus access
- Has read/write access to your OmniFocus database
- Communicates with MCP clients (e.g., Claude Desktop) via stdio
- **Does NOT** transmit data to external servers
- **Does NOT** require network access for core functionality

### Execution Architecture

```text
MCP Client → stdio → MCP Server → osascript → OmniFocus
```

All automation occurs locally through Apple's OSA (Open Scripting
Architecture) framework.

## Supported Versions

| Version | Supported          | Notes                    |
| ------- | ------------------ | ------------------------ |
| 1.x.x   | :white_check_mark: | Current release          |
| < 1.0   | :x:                | Pre-release, unsupported |

We recommend always using the latest version. Security fixes are not
backported to older versions.

## Reporting a Vulnerability

We take security vulnerabilities seriously and appreciate responsible
disclosure.

### Preferred: GitHub Private Vulnerability Reporting

1. Navigate to the [Security tab](../../security)
2. Click **"Report a vulnerability"**
3. Fill out the private security advisory form

This method ensures confidential communication and enables collaborative
fix development.

### Alternative: Email

If GitHub PVR is unavailable, email security concerns to the repository
maintainer directly via GitHub profile contact.

### What to Include

Please provide as much of the following as possible:

- **Vulnerability type** (e.g., injection, data exposure, auth bypass)
- **Affected component** (e.g., specific tool, JXA script, utility)
- **Affected versions** (version numbers or "all")
- **Steps to reproduce** (detailed, numbered steps)
- **Proof of concept** (code, screenshots, or demonstration)
- **Impact assessment** (what could an attacker achieve?)
- **Suggested fix** (optional, but appreciated)
- **Your contact info** (for follow-up and credit)

## Response Timeline

We commit to the following response times:

| Milestone | Timeline | Description |
|-----------|----------|-------------|
| Acknowledgment | 48-72 hours | Confirm receipt, assign tracking |
| Initial Assessment | 7 days | Severity determination, scope analysis |
| Progress Update | 30 days | Share remediation plan with reporter |
| Resolution Target | 90 days | Release fix and coordinate disclosure |

**Expedited Timeline:** Actively exploited vulnerabilities receive priority
handling with a 7-day resolution target.

## Disclosure Policy

We follow **coordinated disclosure** aligned with industry standards:

1. Reporter submits vulnerability privately
2. We acknowledge and assess within stated timelines
3. We develop and test a fix
4. We coordinate disclosure date with reporter
5. Fix is released simultaneously with security advisory
6. CVE assigned if applicable (via GitHub Security Advisories)

The standard disclosure window is **90 days** from initial report. Extensions
may be granted with documented justification and evidence of progress.

## Scope

### In Scope (Security Vulnerabilities)

- **JXA/Script Injection**: Improper escaping allowing arbitrary code execution
- **Data Exposure**: Sensitive OmniFocus data leaked through error messages,
  logs, or improper handling
- **Authentication/Authorization Bypass**: Circumventing intended access
  controls
- **Dependency Vulnerabilities**: Exploitable issues in npm dependencies
- **Path Traversal**: Accessing files outside intended scope
- **Denial of Service**: Causing OmniFocus or the MCP server to crash or hang

### Out of Scope (Not Security Vulnerabilities)

- Bugs in OmniFocus application itself (report to [Omni Group](https://www.omnigroup.com/support/))
- macOS platform security issues (report to [Apple](https://support.apple.com/en-us/HT201220))
- Attacks requiring physical access to the machine
- Social engineering attacks against users
- Issues requiring malicious MCP client (client is trusted by design)
- Third-party MCP clients or integrations
- Theoretical vulnerabilities without demonstrated impact

## Threat Model

### Trusted Components

- MCP client (e.g., Claude Desktop) - assumed non-malicious
- macOS and its security frameworks
- OmniFocus application

### Potential Attack Vectors

| Vector | Mitigation |
|--------|------------|
| Malicious tool input | Zod schema validation on all inputs |
| JXA injection | Proper escaping, parameterized scripts |
| Dependency supply chain | npm audit, Dependabot, lockfile enforcement |
| Sensitive data in errors | Structured error handling, no raw data dumps |

## Dependency Security

We employ multiple layers of dependency security:

- **npm audit**: Run on every build (CI/CD)
- **Dependabot**: Automated security updates enabled
- **package-lock.json**: Enforced for reproducible builds
- **Minimal dependencies**: Core functionality with limited dependency tree

### Reporting Dependency Vulnerabilities

Report via standard process if:

- Direct dependency with no upstream fix available
- Transitive dependency requiring our intervention
- npm audit findings not yet addressed

## Security Best Practices for Users

1. **Keep updated**: Always use the latest version
2. **Review permissions**: Understand macOS Automation permissions granted
3. **Audit MCP config**: Review `claude_desktop_config.json` periodically
4. **Trusted sources only**: Install only from official npm registry
5. **Monitor activity**: Review OmniFocus changes made via automation

## Acknowledgments

We gratefully acknowledge security researchers who responsibly disclose
vulnerabilities. Contributors will be credited here (with permission) after
fixes are released.

---

**Policy Version**: 1.0.0
**Last Updated**: 2025-12-08
**Based on**: OpenSSF OSPS Baseline, GitHub Security Best Practices,
CERT/CC Coordinated Disclosure Guidelines
