---
paths:
  - "specs/**"
---

# Specification Workflow

## Spec-Kit Commands

Use `/speckit.*` commands for structured development:

- `/speckit.specify` - Create/update feature spec
- `/speckit.plan` - Generate implementation plan
- `/speckit.tasks` - Generate task breakdown
- `/speckit.implement` - Execute implementation
- `/speckit.clarify` - Identify underspecified areas
- `/speckit.analyze` - Cross-artifact consistency check

## Directory Structure

```text
specs/[feature-name]/
├── spec.md           # Feature specification
├── plan.md           # Implementation plan
├── tasks.md          # Task breakdown
├── contracts/        # Zod schema contracts
│   ├── index.ts      # Exports all contracts
│   └── shared/       # Shared types
└── data-model.md     # Data model documentation
```

## Contract Files

- Define Zod schemas for API contracts
- Place in `specs/[feature]/contracts/`
- Export from `index.ts` for easy imports

## Workflow Order

1. `/speckit.specify` - Define the feature
2. `/speckit.clarify` - Resolve ambiguities
3. `/speckit.plan` - Design implementation
4. `/speckit.tasks` - Break into actionable items
5. `/speckit.implement` - Execute the plan
