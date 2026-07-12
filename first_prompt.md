Create the initial foundation for a lightweight, mobile-first group discussion app using Expo.

The app will eventually run on:

- iOS
- Android
- Mobile web

For now, prioritize a simple, maintainable foundation and a small working prototype. Do not attempt to build the entire product.

## Core technical requirements

Use:

- Expo
- Expo Router
- React Native
- TypeScript with strict type checking
- React Native Paper as the primary Material Design component library
- npm unless the project already uses another package manager

The project should run with:

- `npx expo start`
- `npx expo start --web`
- Expo Go on Android and iOS

Use the latest stable versions that are mutually compatible with the selected Expo SDK.

## Main priorities

Prioritize, in this order:

1. Simplicity
2. Material Design 3 fidelity
3. Modularity
4. Readability
5. Low dependency count
6. Ease of replacing mock implementations later
7. Cross-platform behavior

Avoid unnecessary abstraction, large frameworks, and premature optimization.

React Native Paper is an approved foundational dependency because Material Design 3 is a core product requirement. Continue to minimize all other dependencies, and explain why each additional package is necessary before adding it.

Before adding any dependency beyond the standard Expo project dependencies and React Native Paper, determine whether it is truly needed. Prefer built-in React, React Native, Expo, Expo Router, and React Native Paper functionality.

Do not add a global state-management library yet. Use local React state and small context providers only where there is a clear need.

The visual implementation is not considered complete merely because it looks polished. It is complete only after its spacing, typography, shape, color roles, component variants, interaction states, accessibility behavior, and responsive behavior have been checked against the applicable Material Design 3 guidance.

## Initial product concept

The app organizes group conversations into focused topics. A group has a host, but members can participate in discussions and eventually initiate votes about group decisions.

For this first version, implement only a very small vertical slice:

1. A home screen displaying a list of topics
2. A button to create a topic
3. A create-topic screen with:
   - Topic name
   - Optional description
4. A topic details screen displaying:
   - Topic name
   - Description
   - A placeholder empty state for messages
5. Newly created topics should appear in the topic list for the duration of the current app session

Do not implement persistence yet.

Do not implement:

- Authentication
- A backend
- A database
- Real-time messaging
- Push notifications
- Polls or voting
- Host permissions
- User profiles
- Contacts
- File uploads
- Analytics
- Complex animations

Use mock or in-memory data, but structure data access so that it can later be replaced by an API without rewriting the screens.

## Architecture

Keep the folder structure simple and intentional.

Use a structure similar to:

- `app/` for Expo Router routes
- `src/components/` for reusable presentation components
- `src/features/` for feature-specific code
- `src/models/` or `src/types/` for shared domain types
- `src/services/` for replaceable data-access implementations
- `src/theme/` for Material theme configuration and shared visual tokens
- `src/utils/` only for genuinely shared utilities

Do not create empty folders or speculative abstractions.

Keep route files thin. Route files should primarily connect routing to feature-level screens rather than contain substantial business logic.

Keep domain logic independent from visual components where practical.

Use named exports except where Expo Router requires default exports.

Avoid barrel files unless they provide a clear benefit.

Keep source files reasonably small and focused. Prefer files under roughly 250 lines unless there is a strong reason not to.

Do not introduce Redux, Zustand, NativeWind, React Native Paper alternatives, a form library, or another UI component library during this phase.

Use platform-specific files only when behavior genuinely differs.

## Material Design requirements

Material Design 3 is the authoritative design system for this application.

Follow the latest stable Material Design 3 guidance available from the official Material Design documentation as closely as Expo, React Native, React Native Paper, Android, iOS, and mobile web reasonably permit.

Treat Material Design as the default answer for all visual and interaction decisions, including:

- Layout
- Spacing
- Padding
- Margins
- Component dimensions
- Shape
- Corner radii
- Typography
- Color roles
- Elevation
- State layers
- Icons
- Touch targets
- Navigation
- Forms
- Dialogs
- Menus
- Lists
- Cards
- Buttons
- App bars
- Empty states
- Loading states
- Motion
- Responsive and adaptive behavior
- Accessibility

Do not invent arbitrary visual values when Material Design provides a relevant token, component specification, component default, or layout rule.

Material Design should be treated as the source of truth. When making a UI decision, first determine whether Material Design already defines the appropriate pattern, token, measurement, component, or interaction.

Before introducing a new measurement, color, typography style, component pattern, or interaction, first check whether Material Design 3 already defines it.

Material spacing should follow the Material layout system. Use documented 4dp spacing increments and appropriate Material spacing conventions rather than arbitrary values.

Use Material typography roles and type-scale tokens rather than choosing unrelated font sizes, weights, or line heights.

Use semantic Material color roles rather than referencing raw colors throughout application code.

Examples include:

- `primary`
- `onPrimary`
- `primaryContainer`
- `onPrimaryContainer`
- `secondary`
- `onSecondary`
- `surface`
- `surfaceVariant`
- `surfaceContainer`
- `surfaceContainerLow`
- `surfaceContainerHigh`
- `onSurface`
- `onSurfaceVariant`
- `outline`
- `outlineVariant`
- `error`
- `onError`
- `errorContainer`
- `onErrorContainer`

Keep raw color values centralized in the theme implementation.

Use Material shape and elevation tokens rather than assigning arbitrary border radii, shadows, or elevation values to individual components.

All interactive elements must include the applicable Material states, including:

- Enabled
- Disabled
- Pressed
- Focused
- Hovered on web
- Selected
- Error
- Loading

Maintain Material-recommended accessible touch-target sizes, contrast, text scaling behavior, keyboard accessibility, screen-reader labels, and focus visibility.

Do not imitate Material Design only superficially. Component behavior, dimensions, states, accessibility, and layout rules matter as much as colors and shapes.

## Material component implementation

Use React Native Paper as the primary Material Design component library unless a standard Expo or React Native component is required for technical reasons.

Prefer existing Material components over recreating them manually.

Use appropriate React Native Paper components where applicable, including:

- `Appbar`
- `Button`
- `Card`
- `Dialog`
- `Divider`
- `FAB`
- `IconButton`
- `List`
- `Menu`
- `Portal`
- `Snackbar`
- `Surface`
- `Text`
- `TextInput`

Use the component variant that best matches the current Material Design guidance and the use case.

Create custom components only when:

1. No suitable Material component exists
2. The product requires a genuinely distinct interaction
3. The custom implementation can still follow Material tokens and behavior

Do not recreate standard Material components solely to alter their appearance.

Do not mix multiple component libraries.

Use Material Community Icons only where they accurately correspond to the intended Material icon semantics. Do not select decorative icons merely because they look appealing.

Do not fork, copy, or reimplement React Native Paper internals unless absolutely necessary.

## Design tokens and theming

Create a centralized Material theme.

At minimum, centralize:

- Color roles
- Typography roles
- Spacing
- Shape
- Elevation
- Animation durations where needed
- Responsive breakpoints or window-size decisions where needed

Components should consume semantic tokens. They should not contain unexplained values such as:

```ts
padding: 13
borderRadius: 7
fontSize: 17
```

When a nonstandard value is unavoidable, add a brief comment explaining why the Material token or component default was not suitable.

Do not create a second competing design-token system on top of React Native Paper. Extend the React Native Paper theme only where necessary.

Support both light and dark themes through semantic Material color roles.

Use a temporary Material-compatible seed color if branding is not yet defined. All generated colors must still be represented through semantic Material roles so the seed color can be replaced later.

Respect the operating system color-scheme preference where practical.

## UI and layout

The app should be designed for phones first.

It should work correctly in:

- Native Android
- Native iOS
- Narrow mobile browsers
- Wider mobile-browser windows without stretching content excessively

Use:

- React Native `StyleSheet` where custom styles are necessary
- React Native Paper theming
- Safe area handling
- Touch-friendly controls
- Accessible labels where appropriate
- Clear empty states
- Basic keyboard handling for forms
- Reasonable maximum content width on larger web screens

Do not build a separate large design system.

Keep the appearance intentionally simple and restrained. The purpose of this phase is architecture, usability, and Material compliance rather than custom visual branding.

Prefer clear hierarchy over decoration.

Avoid excessive cards, containers, outlines, and nested surfaces.

Do not place every section inside a card.

Use one clear primary action per screen where practical.

Use standard Material form components and validation behavior.

Use Material empty-state patterns.

Keep motion subtle, purposeful, and consistent with Material guidance.

Respect reduced-motion preferences where practical.

## Material fidelity and verification

Before implementing or substantially changing a component, consult the applicable official Material Design 3 guidance.

For each major UI component, verify:

- Correct component type
- Correct variant
- Dimensions
- Internal padding
- External spacing
- Typography role
- Shape
- Color roles
- Elevation
- Icon size and placement
- State behavior
- Accessibility behavior
- Responsive behavior
- Dark-theme behavior

When Material documentation provides multiple valid variants, select the simplest variant appropriate for the use case.

When Material guidance does not specify an exact value, use the nearest established Material token or existing component default rather than inventing an unrelated value.

When official Material guidance and a React Native Paper default differ materially:

1. Prefer the official Material Design 3 guidance
2. Override the library carefully through centralized theme tokens or a small wrapper component
3. Document the discrepancy in code or the README
4. Avoid duplicating the library’s internal implementation

Do not claim pixel-perfect Material compliance unless the result has actually been checked against the relevant specification.

Track known deviations honestly.

## Cross-platform behavior

The product should retain one coherent Material Design identity across Android, iOS, and mobile web.

Do not redesign the application to resemble an unrelated iOS design system on iOS.

However, preserve platform-essential behavior where users expect it, including:

- Safe areas
- Keyboard behavior
- Back navigation
- Text input behavior
- Browser focus and hover behavior
- System status and navigation areas
- Reduced-motion preferences

Where Material guidance differs by window size, use adaptive behavior rather than simply scaling the phone layout.

The initial prototype should remain optimized for compact phone widths, but its layout must not break in a wider mobile browser.

## Data and types

Define clear TypeScript types for the initial domain model.

A topic should include at least:

- `id`
- `name`
- `description`
- `createdAt`

Use an interface or service contract for topic operations, with an in-memory implementation.

The application should not make screens directly responsible for storing or retrieving topics.

Do not create a generic repository framework. Keep the service specific to topics and small enough to understand quickly.

Use clear error handling where an operation can fail, even if the in-memory implementation is simple.

Do not use `any`.

## Code-quality requirements

Configure or retain:

- TypeScript strict mode
- ESLint
- Consistent formatting
- A type-check command
- A lint command

Add useful npm scripts where needed.

The completed project should have no TypeScript or lint errors.

Prefer small components with descriptive names.

Avoid:

- `any`
- Large multipurpose components
- Deeply nested props
- Magic strings repeated across the project
- Raw visual values scattered through components
- Comments that merely restate the code
- Generic abstractions created for hypothetical future use
- Premature optimization
- Unnecessary memoization
- Dependency-heavy solutions to simple problems

Add comments only where they explain a non-obvious decision.

## README

Create a thorough but concise `README.md`.

It should include:

1. A brief description of the app concept
2. Current prototype scope
3. Features intentionally not implemented yet
4. Prerequisites
5. Installation instructions
6. Commands for running:
   - Web
   - Android
   - iOS
7. Linting and type-check commands
8. Folder structure
9. A short explanation of the architecture
10. How the in-memory topic service can later be replaced by an API
11. Dependency philosophy
12. Current limitations
13. Recommended next development steps
14. The Expo SDK version
15. The React Native Paper version
16. That Material Design 3 is the project’s authoritative design system
17. How the Material theme is structured
18. Where design tokens are defined
19. How to add a component without bypassing the design system
20. Any known differences between the implementation and official Material guidance
21. The date on which the official Material guidance was last reviewed
22. The official Material Design pages consulted during implementation

Include this contributor rule:

> Before introducing a new measurement, color, typography style, component pattern, or interaction, first check whether Material Design 3 already defines it.

The README should help a new developer understand the project without reading every file.

## Optional architecture documentation

If a major decision cannot be adequately explained in the README, add a short architecture decision record under a lightweight `docs/decisions/` directory.

Do not create architecture documentation for obvious or trivial choices.

## Testing

Do not add a large testing stack in this initial pass.

Only add tests if they can be introduced with minimal tooling and provide clear value for the small topic service or other non-visual logic.

Do not delay the working prototype in order to create broad test coverage.

Document the recommended testing approach for the next phase in the README.

## Implementation process

First inspect the existing directory and determine whether it is empty or already contains an Expo project.

Then:

1. Briefly describe the implementation plan
2. Create or update the Expo project
3. Configure Expo Router
4. Configure React Native Paper and the centralized Material theme
5. Implement the small topic flow
6. Check the relevant official Material Design 3 guidance for each major component used
7. Run the app where possible
8. Run the available lint and type-check commands
9. Fix any errors
10. Review the implementation for unnecessary dependencies and abstractions
11. Review major visual values against Material Design guidance
12. Update the README
13. Summarize the result

Do not silently add unrelated features.

When a requirement is ambiguous, choose the simpler implementation and document the choice.

## Final implementation summary

At the end of the task, report:

- What was created
- Important architectural decisions
- Dependencies added
- Why each nonstandard dependency was necessary
- Commands used to verify the project
- Which Material components were used
- Which theme tokens were established
- Any custom measurements introduced and why
- Any Material guidance that could not be followed because of platform or library constraints
- Known implementation limitations
- Recommended next steps
- The official Material Design pages used as references

Do not report a command as successful unless it was actually run successfully.

Do not claim full Material Design compliance unless the implementation was checked against the relevant official guidance.
