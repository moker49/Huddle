# Roadmap

This roadmap is living documentation. Keep items small and incremental.

Features should generally be implemented as complete vertical slices rather than broad infrastructure work.

## Completed

- Expo, Expo Router, React Native, TypeScript, and React Native Paper foundation.
- Centralized Material theme and shared visual tokens.
- Huddle list.
- Create-huddle flow.
- Huddle detail screen.
- Session-local huddles through a service interface.
- Local in-huddle messaging through a service interface.
- Chat-style message list and Material-aligned composer.
- Shared Material top app bar pattern.
- Direct route-load back navigation fallback.
- Huddle search mode in the main app bar.
- Filtered huddle list by title.
- Contextual huddle creation from huddle search.
- Local network service and provider.
- Single search field for huddles and network members.
- Horizontal network member rail.
- Prefix-filtered network member rail by name or handle.
- Huddle list subtitles showing members.
- Member-based huddle filtering.
- Focused service tests for identity, directory, huddle visibility, and network resolution.
- Google authentication and authenticated local account scoping.
- Supabase-backed profile identity and direct-network persistence.

## Current

- Continue aligning existing screens with Material Design 3 guidance.
- Keep documentation current as UI and service patterns stabilize.
- Keep Google authentication stable while the core huddle product is completed.

## Next

- Add focused tests for message services.
- Add message delivery metadata suitable for a future backend.
- Validate keyboard and safe-area behavior on physical Android and iOS devices.
- Validate compact mobile-web layouts.
- Complete the remaining core huddle workflows before expanding authentication.
- Validate profile and network sync across browsers and devices.

## Future

- API-backed huddle and message services.
- Phone verification, after the core app is substantially complete and the need is validated.
- Real-time messaging.
- Push notifications.
- Host permissions.
- Polls or voting.
- Huddle continuation.
- Profiles.
- Attachments.

Do not start future items until the product slice that needs them is clearly defined.
