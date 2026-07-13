# Huddle

Huddle is a lightweight, mobile-first group discussion prototype built with Expo, Expo Router, React Native, TypeScript, and React Native Paper. Material Design 3 is the authoritative design system.

## Current Scope

The app includes huddle search, people search with recipient chips, shared-huddle filtering, contextual huddle creation, huddle details, profile setup, and local in-huddle messaging. Huddles, connections, and messages are stored locally for the current app environment through replaceable service interfaces.

Not implemented yet: authentication, backend APIs, real-time messaging, push notifications, polls or voting, host permissions, profiles, contacts, file uploads, analytics, and complex animation.

## Project Documentation

Long-term project guidance lives in `docs/`:

- [Architecture](docs/architecture.md)
- [Product](docs/product.md)
- [Coding Standards](docs/coding-standards.md)
- [Design System](docs/design-system.md)
- [Roadmap](docs/roadmap.md)
- [Architecture Decisions](docs/decisions/README.md)

Before introducing a new measurement, color, typography style, component pattern, or interaction, first check whether Material Design 3 already defines it.

## Prerequisites

- Node.js 22.13.x or newer for Expo SDK 57
- npm
- Expo Go for Android or iOS when testing on devices

## Install

```sh
npm install
```

## Run

```sh
npx expo start
npx expo start --web
npx expo start --android
npx expo start --ios
```

## Quality Checks

```sh
npm run lint
npm run typecheck
```

## Versions

- Expo SDK: 57.0.4
- React Native: 0.86.0
- React Native Paper: 5.15.3
- Expo Router: 57.0.4

## Project Shape

- `app/`: Expo Router route files
- `src/components/`: reusable presentation components
- `src/features/`: feature-level screens, providers, and components
- `src/models/`: shared domain types
- `src/services/`: replaceable data-access implementations
- `src/theme/`: Material theme configuration and shared tokens
- `docs/`: source-of-truth project documentation

Route files should stay thin. Feature screens should use typed services through feature providers instead of directly owning persistence or API details.

## Limitations

The prototype is local-first and intentionally small. Messaging has no delivery states, edits, deletes, reactions, attachments, or realtime sync. Broad automated UI tests are deferred; focused service tests are the recommended next testing step.
