# Product

## Product Thesis

Huddle is a network-first topic messenger for real friend groups.

Traditional messaging apps turn every overlap of people into a separate permanent group chat. Huddle is built around a different model:

> People belong to a network. Conversations happen in topics.

The app should feel as simple as a normal chat app while making it easier to find the right conversation, avoid duplicate overlapping group chats, and let topics evolve naturally.

## Core Loop

The intended user loop is:

1. Open the app.
2. Search by what you want to discuss or who you want to talk with.
3. Open the right topic or create one.
4. Chat.

Product complexity should stay behind this loop.

## Core Concepts

### Network

Users have a personal network, not fixed friend groups, servers, or communities. Network language should prefer terms such as:

- Network
- Connection
- Connect
- Add to network

Avoid making "friend group" the primary product model.

### Topic

A topic is the primary conversation space. It is a persistent discussion around a subject, event, audience, or shared context.

Topics are intentionally loose. A topic can be renamed, archived, revived, continued elsewhere, or evolve as people join and leave. A topic is not a server, channel, or rigid group.

Examples:

- Camping 2027
- Friday Dinner
- Kevin Birthday
- Memes
- Trip Planning
- Computers

### Activity

A topic timeline should eventually contain more than messages. Messages, member changes, topic changes, proposals, votes, continuation markers, and system markers should be understandable as activity in the same timeline.

This lets a topic explain its own history without separate administrative screens becoming the primary experience.

## Discovery

The main screen should help users find topics in two natural ways:

- By subject: "What do I want to talk about?"
- By people: "Who do I want to talk with?"

The long-term main-screen model is a search selector plus a search field. Topic search filters by text. People search behaves like a recipient field with selected people as chips, then shows topics shared by those people.

This people-first discovery flow is central to the product. Users should not need to remember which overlapping group chat contains the people they want.

## Creating Topics

Topic creation should be contextual:

- From topic search, the search text can become the topic title.
- From people search, selected people can become the initial members.

Topic title is required. Members can be added during or after creation.

The app should warn about likely duplicate topics with similar title and similar members, but duplicates should remain possible. Topics are loose, so uniqueness should not be enforced as a hard rule.

## Membership and History

For v1, members can see the full history of a topic.

There is no partial-history membership model. Because of this, adding a member must clearly warn that the new member can see prior messages.

When a member joins, the topic timeline should record the join and the full-history implication.

## Host and Governance

There are no global admins and no server owners.

A topic has a host, not a permanent admin. The host is the topic starter and can help establish the topic while low-risk capabilities remain host-controlled.

Host-controlled capabilities may include:

- Rename topic
- Change icon
- Set auto-archive date
- Add members with a full-history warning
- Continue the topic elsewhere and make the old topic read-only

The host should not directly remove members, delete a topic for everyone, delete another person's content, or perform platform moderation.

When members vote on a host-controlled capability, that capability becomes collective from then on. For v1, control should only move one way:

```text
Host-controlled -> Collective
```

Do not build a fully generic governance platform. Governance exists only to handle structural topic changes.

## Proposals and Voting

Use typed proposals with fixed rules rather than a customizable governance engine.

Potential proposal types:

- Rename topic
- Change icon
- Set auto-archive date
- Add member
- Remove member
- Continue in another topic
- Delete topic

The backend should eventually own proposal rules and vote outcomes. Clients should display state and submit user intent; they should not be the source of truth for whether an action is allowed.

## Continuation and Branching

Avoid true topic merges in v1. Moving messages, combining histories, and combining permissions are too complex and risky.

Use continuation instead:

- Old topic becomes read-only.
- Old topic links to the new topic.
- New topic records that the old topic continued there.
- No messages are moved.
- No histories are merged.
- No permissions are combined.

For lightweight branching, let users start a new topic from a message or activity. The new topic should link back to the original context, and the original topic should record the continuation marker.

## Blocking

Blocking is personal, not structural.

If one user blocks another, they can still share topics. The blocked user's message content is hidden by default for the blocker, and the blocker may reveal individual messages when needed.

Blocking should also prevent hidden message content from appearing in notifications, previews, mentions, and search for the blocker.

## Account Exit

Keep account exit simple:

- Keep content attributed as-is.
- Anonymize prior content as a deleted user.

Avoid granular deletion controls in v1.

## Privacy Model

Huddle is a friends app, not a secrecy-first encrypted privacy product.

The product should be honest and socially understandable:

- Members can see full topic history.
- Adding members warns clearly.
- There are no hidden channels.
- There are no global topic browsers.
- Blocks are personal.
- Topic-level decisions are visible in the timeline.

If users want to exclude people, they should create a different topic.

## Platform Moderation

Topic governance and platform moderation are separate.

Topic governance handles social structure inside a topic. Platform moderation handles safety, abuse reports, illegal content, spam, account compromise, and platform limits.

## Product Boundaries

Keep v1 flat:

```text
Network -> Topics
```

Avoid:

- Servers
- Communities
- Channel hierarchies
- Parent/child topics
- True merges
- Partial message visibility
- Generic governance systems
- Copied bridge messages
- Granular account-deletion policies

These boundaries keep the product from becoming a Discord, Slack, or governance platform.

## Implementation Scope

Governance, proposals, blocking, continuation, account exit, and platform moderation describe product direction. They are not near-term implementation scope unless a roadmap item explicitly calls for them.

Near-term work should prioritize the core loop in small vertical slices: find a topic, create a topic, open a topic, and chat.

## Mobile Strategy

The product is mobile-first and mobile-browser-first. Mobile web matters because users should be able to join through a link without installing an app.

Native apps can later provide stronger push notifications, app badges, camera access, media pickers, share sheets, deep links, and smoother gestures.

The initial web experience may remain phone-sized and should not become a separate desktop product.
