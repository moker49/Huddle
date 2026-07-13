# Coding Standards

## TypeScript

Use strict TypeScript. Prefer explicit domain types and clear function signatures. Do not use `any`.

Use interfaces for stable object shapes and service contracts. Use type aliases when they better express unions, callbacks, or derived types.

## File Organization

Keep files focused and reasonably small. Route files belong in `app/`; feature-owned screens, components, and providers belong in `src/features/`; shared presentation components belong in `src/components/`.

Avoid barrel files unless they provide a clear benefit.

## Components

Prefer function components with named exports. Keep component props explicit and narrow.

Separate reusable presentation components from feature screens when reuse or readability justifies it. Do not split components only to satisfy an arbitrary file count.

Use React Native Paper components first for Material UI.

## Naming

Use descriptive names:

- Components: `PascalCase`
- Hooks: `useThing`
- Services: `ThingService`, `LocalThingService`
- Models: domain nouns such as `Topic` or `Message`
- Files: match the primary export when practical

## Exports

Use named exports except where Expo Router requires default exports.

## Error Handling

Handle expected service failures explicitly and show user-facing feedback where appropriate. Keep error messages clear and actionable.

Do not swallow errors silently. Do not expose implementation details in user-facing messages.

## Comments

Comments should explain non-obvious decisions, constraints, or tradeoffs. Avoid comments that restate the code.

## Dependencies

Prefer the current Expo, React Native, Expo Router, and React Native Paper stack. Before adding a dependency, confirm that the existing stack cannot solve the problem cleanly.

Do not add another UI library, styling framework, global state library, form library, analytics SDK, or database without an architectural decision.

## React Practices

Use local state for local state. Keep effects focused and dependency-safe. Avoid unnecessary memoization.

Prefer simple props and callbacks over deep prop structures. Keep render logic readable.

## Service Patterns

Define small service interfaces around feature operations. Keep implementation details behind the interface. Do not let screens directly own persistence or network details.

Service methods should be typed, purposeful, and specific to the domain.

## State Management

Use small feature providers when state must be shared across screens. Avoid app-wide stores until repeated cross-feature coordination creates a real need.

## Performance

Optimize for correctness and clarity first. Measure before introducing complexity. Avoid premature caching, memoization, and virtualization.

## Refactoring

Refactor when it reduces real complexity or clarifies a stable concept. Avoid broad rewrites during feature work unless the feature cannot be completed safely without them.

## Do

- Keep routes thin.
- Keep feature code close to the feature.
- Use semantic theme roles and shared tokens.
- Keep services replaceable.
- Run typecheck and lint after meaningful changes.
- Prefer complete vertical slices.

## Avoid

- `any`
- Large multipurpose components
- Repeated magic strings
- Raw visual values scattered through UI
- Speculative abstractions
- Dependency-heavy solutions
- Recreating standard Material components
- Mixing component libraries
