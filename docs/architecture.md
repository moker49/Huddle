# Architecture

## Project Goals

Huddle is a lightweight, mobile-first group discussion app. The product model is network-first: users belong to a personal network, and conversations happen in huddles with members. Product principles live in [Product](product.md).

The project should grow through small, working vertical slices that are easy to understand, easy to verify, and easy to replace with real services later.

The enduring priorities are:

1. Simplicity
2. Material Design 3 fidelity
3. Modularity
4. Readability
5. Low dependency count
6. Replaceable mock or local implementations
7. Coherent cross-platform behavior

## Overall Architecture

The app uses Expo, Expo Router, React Native, TypeScript, and React Native Paper. Expo Router owns navigation. Feature modules own feature screens and UI. Services own data access contracts and implementations. Domain types live separately from UI.

Route files should stay thin. They connect a URL or route segment to a feature screen and should not contain business logic, data access, or substantial UI composition.

## Folder Structure

- `app/`: Expo Router routes and route-level defaults.
- `src/components/`: reusable presentation components that are not owned by one feature.
- `src/features/`: feature screens, feature-specific components, and feature providers.
- `src/models/`: shared domain types.
- `src/services/`: replaceable service interfaces and local/API implementations.
- `src/theme/`: React Native Paper theme configuration and shared visual tokens.
- `src/utils/`: genuinely shared utilities.
- `docs/`: long-term project documentation and architectural decisions.

Do not create folders for hypothetical future code.

## Separation of Responsibilities

UI components render state and expose user intent through callbacks. They should not own data access.

Feature screens compose feature UI, call feature providers or services, and coordinate screen-level behavior.

Domain models describe app concepts in TypeScript without depending on React.

Services define replaceable contracts for data operations. Screens should depend on service contracts through feature providers, not on storage details.

Routing connects navigation to screens. It should not become the app architecture.

## Dependency Philosophy

Prefer built-in React, React Native, Expo, Expo Router, and React Native Paper capabilities. React Native Paper is foundational because Material Design 3 is a product requirement.

Every new dependency must solve a concrete problem that the existing stack does not solve well. Avoid adding dependency-heavy solutions for simple local problems.

Do not add a second UI library, styling framework, generic repository framework, or global state library without a clear architectural decision.

## State Management

Use local React state for local UI state. Use small context providers only when multiple screens or components need the same feature state.

Do not introduce global state management until the app has a demonstrated need that local state and focused providers cannot satisfy.

The local user identity is the root of the app graph. Routes that depend on huddles, network members, or messages should be gated until the user has a complete identity. A complete identity is currently display name plus tag or phone number.

## Service Abstractions

Create service interfaces around app-specific operations, not generic data frameworks. A service should be small, typed, and replaceable.

Local, in-memory, or file-backed implementations are acceptable for prototypes when the interface can later be backed by an API without rewriting screens.

## Platform Strategy

The app targets Expo on Android, iOS, and mobile web. It should retain one coherent Material Design identity across platforms while respecting platform essentials such as safe areas, keyboard behavior, browser focus behavior, system navigation areas, and accessibility.

Use platform-specific code only when behavior genuinely differs.

## Adding Features

Implement features as complete vertical slices whenever practical: route, screen, UI, state, service contract, local implementation, and verification.

Keep slices small. Prefer one useful capability over broad infrastructure for imagined future needs.

New features should preserve:

- Thin routes
- Feature ownership
- Replaceable services
- Material Design 3 compliance
- TypeScript strictness
- Low dependency count

## Avoid Premature Abstraction

Do not abstract:

- A second design system
- Generic repositories
- Global state stores
- Form frameworks
- Cross-feature utilities used only once
- Platform-specific files for identical behavior
- Component wrappers that only rename React Native Paper APIs

Add abstractions only when they reduce real duplication, isolate real volatility, or express a stable project concept.
