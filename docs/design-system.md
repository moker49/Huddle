# Design System

Material Design 3 is the authoritative design system for Huddle.

React Native Paper is the primary implementation library for Material components. Custom UI should extend or compose Material patterns rather than replace them.

## Theme Philosophy

Use semantic Material theme roles instead of raw visual values in components. Raw colors belong in the theme implementation. Components should consume roles such as `primary`, `surface`, `surfaceVariant`, `onSurface`, `onSurfaceVariant`, `error`, and related container roles.

The app should support light and dark themes through semantic roles and operating-system color-scheme preferences where practical.

## Color

Colors communicate hierarchy, state, and meaning. Use Material color roles for surfaces, content, actions, errors, and disabled states.

Do not introduce one-off colors in components. If a new color role is needed, add it through the theme and document why the existing Material roles were insufficient.

Main action buttons should use the same color standard as the Material FAB: `primaryContainer` for the button or icon-button container and `onPrimaryContainer` for text or icons. This applies to the primary action on a screen or workflow, such as create, save, profile setup, and send. Use disabled Material roles for unavailable actions.

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

## Text Input Focus

Member search is a typing-first flow. When the user is typing members, focus should stay on the member text field as much as possible.

Interactions that are part of member search should not steal focus from the text field. This includes selecting a member from the network dropdown, removing a member chip, and using adjacent controls that directly support the member search flow. Preserving focus prevents keyboard flicker on mobile web and keeps repeated member entry fast.

The current convention is to prevent press-start events from moving focus before the action runs. On web, controls related to the member text field use `onMouseDown`, `onPointerDown`, and `onTouchStart` with `event.preventDefault()`, plus `focusable={false}` where the component supports it. This is the same convention used by the chat composer send and attachment buttons.

Do not replace this with blur-then-refocus behavior. Calling `focus()` after a button press can still hide and reshow the on-screen keyboard, which feels broken. If a new member-search control is added, preserve text-field focus at the press-start level.

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

## Search and Member Rail

The main screen uses a single search field for huddles and network members. Do not add a mode toggle, segmented button, connected button group, dropdown, or ghost chip to the main search flow unless the product model changes.

Network members are shown in a horizontal member rail below the search field. They should look like contact shortcuts: circular avatar or avatar-like icon, label underneath, and no chip container. Selected members use a filled card background with `secondaryContainer` / `onSecondaryContainer` roles so the selected state is visible beyond the avatar.

The search text filters both the huddle list and the visible member rail. Tapping a member toggles that member as an active filter. Preserve the text-input focus convention for member rail interactions.

## Custom Components

Custom components are appropriate when:

- No suitable Paper component exists.
- The product needs a distinct interaction.
- The implementation still follows Material tokens, states, and accessibility behavior.

Do not recreate standard Material components solely to change their appearance.

`HuddleFab` is the project FAB implementation for create/save workflows because React Native Paper's animated FAB layout did not match the Material 3 extended FAB geometry in this app. Keep it aligned with Material 3 FAB specs: 56dp height, 24dp icon, 16dp leading padding, 12dp icon-label gap, 20dp trailing padding, primary container roles, disabled roles, and visible pressed/hover/focus state layers. Do not replace it with a one-off button or a second FAB implementation without first verifying the Material geometry and documenting the reason.

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
