# Project Overview

## Purpose
OmniFocus MCP Server is a Model Context Protocol (MCP) server that bridges AI assistants (like Claude) with OmniFocus task management on macOS. It enables AI models to interact with OmniFocus through natural language by providing tools to view, create, edit, and remove tasks and projects.

## Tech Stack
- **Language**: TypeScript
- **Runtime**: Node.js
- **Key Dependencies**:
  - `@modelcontextprotocol/sdk` (v1.8.0+) - MCP protocol implementation
  - `zod` (v3.22.4) - Schema validation
- **Automation**: JXA (JavaScript for Automation) via AppleScript
- **Build Tool**: TypeScript compiler (tsc)
- **Distribution**: npm package (omnifocus-mcp)

## Platform
- **Target OS**: macOS only (requires OmniFocus)
- **Integration Method**: JXA scripts executed via `osascript -l JavaScript`

## Key Features
- Query OmniFocus database with filters (fast, targeted)
- Full database dump for comprehensive analysis
- Single item operations (add/edit/remove tasks and projects)
- Batch operations with hierarchy support and cycle detection
- Perspective management (list and view)
- Natural language task creation from conversations
