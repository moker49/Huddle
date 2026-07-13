# Design System

Material Design 3 is the authoritative design system for Huddle.

React Native Paper is the primary implementation library for Material components. Custom UI should extend or compose Material patterns rather than replace them.

## Theme Philosophy

Use semantic Material theme roles instead of raw visual values in components. Raw colors belong in the theme implementation. Components should consume roles such as `primary`, `surface`, `surfaceVariant`, `onSurface`, `onSurfaceVariant`, `error`, and related container roles.

The app should support light and dark themes through semantic roles and operating-system color-scheme preferences where practical.

## Color

Colors communicate hierarchy, state, and meaning. Use Material color roles for surfaces, content, actions, errors, and disabled states.

Do not introduce one-off colors in components. If a new color role is needed, add it through the theme and document why the existing Material roles were insufficient.

## Typography

Use Material typography roles through React Native Paper `Text` variants. Do not choose arbitrary font sizes, weights, or line heights.

Typography should support clear hierarchy, text scaling, and readable compact layouts.

## Spacing

Spacing should follow Material's 4dp grid and existing shared tokens. Prefer component defaults where React Native Paper already defines appropriate internal spacing.

Do not add unexplained measurements such as `13`, `17`, or `7`.

## Shape

Use Material shape guidance and shared shape tokens. Avoid arbitrary border radii. Fully round controls should be used only when the Material component or interaction calls for it.

## Elevation

Use React Native Paper elevation and surface roles. Avoid custom shadows unless Material or Paper cannot express the needed elevation.

## Motion

Motion should be subtle, purposeful, and consistent with Material guidance. Respect reduced-motion preferences where practical.

## Accessibility

Interactive elements need accessible labels when their purpose is not clear from text. Preserve Material touch targets, contrast, focus visibility, disabled states, loading states, hover states on web, and keyboard behavior.

## Responsive Behavior

Design for phones first. Layouts should work on Android, iOS, narrow mobile browsers, and wider mobile-web windows without stretching content excessively.

Use adaptive layout choices where Material guidance differs by window size. Do not scale typography with viewport width.

## Component Usage

Prefer React Native Paper components such as:

- `Appbar`
- `Button`
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

Choose the simplest Material variant that fits the use case.

## Custom Components

Custom components are appropriate when:

- No suitable Paper component exists.
- The product needs a distinct interaction.
- The implementation still follows Material tokens, states, and accessibility behavior.

Do not recreate standard Material components solely to change their appearance.

## New Visual Styles

Before introducing a new measurement, color, typography style, component pattern, or interaction, first check whether Material Design 3 already defines it.

If a deviation is necessary, keep it small, centralize it when possible, and document the reason.

## Verification

For major UI changes, check:

- Component type and variant
- Dimensions and touch targets
- Internal and external spacing
- Typography role
- Shape and elevation
- Color roles
- Icon size and placement
- Enabled, disabled, pressed, focused, hovered, selected, error, and loading states
- Accessibility labels and focus behavior
- Responsive behavior
- Dark-theme behavior

Do not claim full Material compliance unless the relevant guidance has actually been checked.
