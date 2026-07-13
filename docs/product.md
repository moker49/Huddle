# Product

## Product Thesis

Huddle is a network-first huddle messenger for real friend groups.

Traditional messaging apps turn every overlap of users into a separate permanent group chat. Huddle is built around a different model:

> Users belong to a personal network. Conversations happen in huddles with members.

The app should feel as simple as a normal chat app while making it easier to find the right conversation, avoid duplicate overlapping group chats, and let huddles evolve naturally.

## Core Loop

The intended user loop is:

1. Open the app.
2. Search by what you want to discuss or who you want to talk with.
3. Open the right huddle or create one.
4. Chat.

Product complexity should stay behind this loop.

## Core Concepts

### Network

Users have a personal network, not fixed friend groups, servers, or communities. A user's network contains users they manually add and users automatically available because they share a huddle.

Network language should prefer terms such as:

- Network
- Network member
- Add to network

Avoid making "friend group" the primary product model.

### Huddle

A huddle is the primary conversation space. It is a persistent discussion around a subject, event, audience, or shared context.

Huddles are intentionally loose. A huddle can be renamed, archived, revived, continued elsewhere, or evolve as members join and leave. A huddle is not a server, channel, or rigid group.

Examples:

- Camping 2027
- Friday Dinner
- Kevin Birthday
- Memes
- Trip Planning
- Computers

### Activity

A huddle timeline should eventually contain more than messages. Messages, member changes, huddle changes, proposals, votes, continuation markers, and system markers should be understandable as activity in the same timeline.

This lets a huddle explain its own history without separate administrative screens becoming the primary experience.

## Discovery

The main screen should help users find huddles in two natural ways:

- By subject: "What do I want to talk about?"
- By network member: "Who do I want to talk with?"

The long-term main-screen model is a search selector plus a search field. Huddle search filters by text. Network search finds users in the current user's network, represents selected users as member chips, then shows huddles shared by those members.

This network-first discovery flow is central to the product. Users should not need to remember which overlapping group chat contains the members they want.

## Creating Huddles

Huddle creation should be contextual:

- From huddle search, the search text can become the huddle title.
- From network search, selected network users can become the initial members.

Huddle title and at least one member are required. Members are added from the user's network.

The app should warn about likely duplicate huddles with similar title and similar members, but duplicates should remain possible. Huddles are loose, so uniqueness should not be enforced as a hard rule.

## Membership and History

For v1, members can see the full history of a huddle.

There is no partial-history membership model. Because of this, adding a member must clearly warn that the new member can see prior messages.

When a member joins, the huddle timeline should record the join and the full-history implication.

## Host and Governance

There are no global admins and no server owners.

A huddle has a host, not a permanent admin. The host is the huddle starter and can help establish the huddle while low-risk capabilities remain host-controlled.

Host-controlled capabilities may include:

- Rename huddle
- Change icon
- Set auto-archive date
- Add members with a full-history warning
- Continue the huddle elsewhere and make the old huddle read-only

The host should not directly remove members, delete a huddle for everyone, delete another person's content, or perform platform moderation.

When members vote on a host-controlled capability, that capability becomes collective from then on. For v1, control should only move one way:

```text
Host-controlled -> Collective
```

Do not build a fully generic governance platform. Governance exists only to handle structural huddle changes.

## Proposals and Voting

Use typed proposals with fixed rules rather than a customizable governance engine.

Potential proposal types:

- Rename huddle
- Change icon
- Set auto-archive date
- Add member
- Remove member
- Continue in another huddle
- Delete huddle

The backend should eventually own proposal rules and vote outcomes. Clients should display state and submit user intent; they should not be the source of truth for whether an action is allowed.

## Continuation and Branching

Avoid true huddle merges in v1. Moving messages, combining histories, and combining permissions are too complex and risky.

Use continuation instead:

- Old huddle becomes read-only.
- Old huddle links to the new huddle.
- New huddle records that the old huddle continued there.
- No messages are moved.
- No histories are merged.
- No permissions are combined.

For lightweight branching, let users start a new huddle from a message or activity. The new huddle should link back to the original context, and the original huddle should record the continuation marker.

## Blocking

Blocking is personal, not structural.

If one user blocks another, they can still share huddles. The blocked user's message content is hidden by default for the blocker, and the blocker may reveal individual messages when needed.

Blocking should also prevent hidden message content from appearing in notifications, previews, mentions, and search for the blocker.

## Account Exit

Keep account exit simple:

- Keep content attributed as-is.
- Anonymize prior content as a deleted user.

Avoid granular deletion controls in v1.

## Privacy Model

Huddle is a friends app, not a secrecy-first encrypted privacy product.

The product should be honest and socially understandable:

- Members can see full huddle history.
- Adding members warns clearly.
- There are no hidden channels.
- There are no global huddle browsers.
- Blocks are personal.
- Huddle-level decisions are visible in the timeline.

If users want to exclude other users, they should create a different huddle.

## Platform Moderation

Huddle governance and platform moderation are separate.

Huddle governance handles social structure inside a huddle. Platform moderation handles safety, abuse reports, illegal content, spam, account compromise, and platform limits.

## Product Boundaries

Keep v1 flat:

```text
Network -> Huddles
```

Avoid:

- Servers
- Communities
- Channel hierarchies
- Parent/child huddles
- True merges
- Partial message visibility
- Generic governance systems
- Copied bridge messages
- Granular account-deletion policies

These boundaries keep the product from becoming a Discord, Slack, or governance platform.

## Implementation Scope

Governance, proposals, blocking, continuation, account exit, and platform moderation describe product direction. They are not near-term implementation scope unless a roadmap item explicitly calls for them.

Near-term work should prioritize the core loop in small vertical slices: find a huddle, create a huddle, open a huddle, and chat.

## Naming

"Huddle" is the user-facing name for the conversation space. Internal code may still use `Topic` for the underlying domain model until a full rename provides more value than churn.

## Mobile Strategy

The product is mobile-first and mobile-browser-first. Mobile web matters because users should be able to join through a link without installing an app.

Native apps can later provide stronger push notifications, app badges, camera access, media pickers, share sheets, deep links, and smoother gestures.

The initial web experience may remain phone-sized and should not become a separate desktop product.
