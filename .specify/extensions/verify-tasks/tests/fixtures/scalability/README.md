# Scalability Test Project

A minimal Python application used as the scalability test fixture for `/speckit.verify-tasks` (SC-003).

## Structure

```
src/
├── models/          # Data classes: User, Product, Order, OrderItem
├── repos/           # In-memory repositories
├── services/        # Business logic: UserService, ProductService, OrderService
├── handlers/        # Request handlers: UserHandler, ProductHandler, OrderHandler
├── middleware/      # AuthMiddleware, LoggingMiddleware, CorsMiddleware
├── config/          # Settings, configure_logging
├── db/              # DBConnection, run_migrations
├── utils/           # paginate, to_json, from_json, slugify, validate_email, validate_uuid
├── router.py        # URL routing
├── app.py           # Application bootstrap
└── main.py          # Entry point
migrations/
└── 0001_initial.sql # Database schema
tests/
├── unit/            # Unit tests
└── integration/     # Integration tests
config.yml           # Default configuration
```

## Setup

```bash
python src/main.py
```

## Usage

This fixture is for running `/speckit.verify-tasks` with 50 tasks to verify scalability. All 50 tasks should produce `VERIFIED` verdicts.
