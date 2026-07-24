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
- Supabase-backed in-huddle messages and system activities through a service interface.
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
- Google profile photo synchronization for member and message avatars.
- Supabase-backed profile identity and direct-network persistence.
- Supabase-backed huddle persistence and identity-scoped visibility.
- Realtime synchronization for huddle lists and open message feeds.
- Derived auto-archive classification with active and archived huddle lists.
- Private Supabase-backed huddle unread counts.
- Private in-feed unread boundary and initial unread-message positioning.
- Member profile card from message authors, with shared-huddle navigation.
- Optional Material icon selection for huddles, with title-initial fallback.
- Leaving a huddle revokes access while retaining the membership lifecycle record.

## Current

- Continue aligning existing screens with Material Design 3 guidance.
- Keep documentation current as UI and service patterns stabilize.
- Keep Google authentication stable while the core huddle product is completed.

## Next

- Validate keyboard and safe-area behavior on physical Android and iOS devices.
- Validate compact mobile-web layouts.
- Complete the remaining core huddle workflows before expanding authentication.
- Validate profile and network sync across browsers and devices.
- Validate huddle creation and phone-claimed visibility across browsers and devices.
- Validate realtime behavior across browsers and devices, including member removal.

## Future

- Phone verification, after the core app is substantially complete and the need is validated.
- Push notifications.
- Host permissions.
- Polls or voting.
- Huddle continuation.
- Personal past-huddles and rejoin flow for retained left memberships.
- Profiles.
- Attachments.

Do not start future items until the product slice that needs them is clearly defined.
