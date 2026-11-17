# Security Policy

## Reporting a vulnerability

Please report security issues **privately** through GitHub:
[Report a vulnerability](https://github.com/themotionmachine/OmniFocus-MCP/security/advisories/new)
(Security tab → "Report a vulnerability").

Please don't open a public issue or pull request for a vulnerability until a fix is released.

Include what you can: affected version, the tool and input involved, steps to reproduce, and impact. A proposed patch is welcome but not required.

## What to expect

You'll get an acknowledgement, a fix in a patch release, and, for confirmed vulnerabilities, a GitHub Security Advisory crediting you unless you'd rather not be named.

## Scope

This server runs Omni Automation and AppleScript against your OmniFocus database, so the main risk is **injection**: tool input that escapes its string and runs as code inside OmniFocus. Agent-driven calls are a realistic path to that (prompt injection persuading a model to pass a crafted argument). Reports in that class are especially useful.

Only the latest release receives security fixes.
