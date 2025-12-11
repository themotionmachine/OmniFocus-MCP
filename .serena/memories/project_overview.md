# Project Overview

## Purpose
OmniFocus MCP Server is a Model Context Protocol (MCP) server that bridges AI assistants (like Claude) with OmniFocus task management on macOS. It enables AI models to interact with OmniFocus through natural language by providing tools to view, create, edit, and remove tasks and projects.

## Tech Stack

See CLAUDE.md for current versions. Key technologies:
- TypeScript, Node.js, @modelcontextprotocol/sdk, Zod
- JXA (JavaScript for Automation) for OmniFocus interaction
- tsup for builds, Vitest for testing, Biome for linting

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
