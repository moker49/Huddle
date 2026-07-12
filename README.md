# Huddle

Huddle is a lightweight, mobile-first group discussion prototype built with Expo, Expo Router, React Native, TypeScript, and React Native Paper. Material Design 3 is the authoritative design system for this project.

## Current Scope

The prototype includes a topic list, a create-topic flow, topic details, and local in-topic messaging with a chat-style list and Material composer. Newly created topics and messages are kept only for the current app session.

Not implemented yet: authentication, backend APIs, persistence, real-time messaging, push notifications, polls or voting, host permissions, profiles, contacts, file uploads, analytics, and complex animation.

## Prerequisites

- Node.js 22.13.x or newer for Expo SDK 57. Node 20.19.4 or newer is accepted by the installed React Native packages, but Expo's SDK table recommends 22.13.x.
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

## Folder Structure

- `app/`: Expo Router route files
- `src/components/`: reusable presentation components
- `src/features/`: feature-level screens, providers, and components
- `src/models/`: shared domain types
- `src/services/`: replaceable data-access implementations
- `src/theme/`: Material theme configuration and shared tokens

Route files are intentionally thin and connect Expo Router to feature screens. Topic data access is kept behind `TopicService`, currently implemented by `InMemoryTopicService`, so a later API-backed service can replace it without rewriting the screens. Message data follows the same pattern through `MessageService` and `InMemoryMessageService`.

## Design System

React Native Paper provides Material Design 3 components and theme roles. Raw color values are centralized in `src/theme/theme.ts`; spacing, shape, and layout tokens are defined in `src/theme/tokens.ts`.

Before introducing a new measurement, color, typography style, component pattern, or interaction, first check whether Material Design 3 already defines it.

To add a component, prefer an existing React Native Paper component, consume semantic theme roles such as `primary`, `surface`, `onSurfaceVariant`, and use the shared spacing or shape tokens. Add custom visual values only when a Material or Paper default is not suitable, and document the reason.

## Dependencies

The project keeps dependencies close to the standard Expo stack. React Native Paper is included because Material Design 3 fidelity is a product requirement. `@expo/vector-icons` is included so Paper can render Material Community Icons consistently across Expo-supported platforms.

No global state-management library, form library, database, analytics SDK, or second UI library is included.

## Material Components Used

- `Appbar` for top app bars and back navigation
- `List.Item`, `List.Icon`, and `Divider` for the topic list
- `FAB` for the primary create action
- `TextInput`, `HelperText`, and `Button` for topic creation
- `TextInput` and `IconButton` for the message composer
- `ActivityIndicator`, `Snackbar`, `Icon`, and `Text` for loading, feedback, empty states, and typography

## Known Material Deviations

React Native Paper provides MD3-compatible defaults, but exact pixel parity with the official web specifications has not been claimed. The app uses Paper defaults where possible and small centralized 4dp-based tokens where layout spacing is required. The topic page uses a custom Material-aligned app-bar composition to keep the topic avatar and title compact on chat screens. Web hover and focus behavior rely on React Native Paper and React Native Web support.

Official Material guidance was last reviewed on 2026-07-11 for:

- https://m3.material.io/components/buttons/overview
- https://m3.material.io/components/lists/overview
- https://m3.material.io/components/text-fields/overview
- https://m3.material.io/components/floating-action-button/overview
- https://m3.material.io/components/app-bars/overview
- https://m3.material.io/styles/color/overview
- https://m3.material.io/styles/typography/overview
- https://m3.material.io/foundations/layout/overview

## Limitations

Topics and messages are stored in memory and disappear when the app reloads. Messaging is local-only; newly sent messages use the current placeholder author and have no delivery states, edits, deletes, attachments, reactions, or realtime sync. The theme uses a temporary teal seed-inspired color set until branding is defined. Broad automated UI tests are intentionally deferred.

## Next Steps

Add focused unit tests for the topic and message services, introduce persistent storage or API-backed services, add multi-author message metadata and delivery states, and validate the interface on physical iOS and Android devices plus mobile web widths.
