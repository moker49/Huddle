# Network-First Topic Messenger — Core Ideas and Flows

## Product concept

This app is a mobile-first messaging experience for friend groups that naturally overlap.

Traditional messaging apps force every combination of people into a separate permanent group chat. Over time, a friend group becomes a messy Venn diagram of chats: one for everyone, one without one person, one for a trip, one for dinner, one for memes, one for a birthday surprise, and so on.

This app is built around a different idea:

> People do not belong to fixed groups. They belong to a network. Conversations happen in topics.

There are no servers, no communities, no channels, and no permanent group-admin hierarchy. Every user exists in the same global app space. Users build a personal network of people they know, and they create or find topics with those people.

The app should feel as simple as a normal chat app, but with better tools for finding the right conversation and avoiding duplicate overlapping group chats.

---

## Core philosophy

### 1. Topics are the primary object

A topic is the main conversation space.

A topic can be something like:

- Camping 2027
- Friday Dinner
- Kevin Birthday
- Memes
- Fantasy Football
- Trip Planning
- Computers

A topic is not a server, channel, or group. It is a persistent conversation around a subject or audience.

Topics are intentionally loose. They do not have a rigid definition. A topic may change title, change members, archive, revive, or continue elsewhere. It is meant to evolve naturally.

### 2. Users have a network, not friend groups

Instead of joining servers or managing groups, users have a personal network.

A network contact may come from:

- direct connection
- phone contacts
- shared topics
- friend-of-a-friend exposure
- manual add/connect action

The UI language should probably avoid “friend” as the core model. Better language:

- Network
- Connection
- Add to network
- Connect

A friend-of-a-friend can become part of your visible network if they appear in shared topics. This keeps the app aligned with real-life friend groups, where people often meet through mutual friends.

### 3. No global admins

There is no Discord-style server admin.

No person controls the whole network. There is no “king” who can see every topic, browse hidden channels, or override everyone else.

Control exists only at the topic level.

### 4. Topics have a host, not an admin

The person who creates a topic is the initial host.

The host can directly perform certain low-risk structural actions, because they created the topic and should be able to get it started without bureaucracy.

The host is not a permanent owner. The host role is closer to “topic starter” than “admin.”

The host can directly:

- rename the topic
- change the icon
- set or change expiration
- add members, with a clear full-history warning
- make the topic read-only and continue it elsewhere

The host cannot directly:

- remove another member
- delete the topic for everyone
- delete or anonymize another person’s content
- perform platform moderation actions

Those require a vote or platform-level moderation.

### 5. Host power can fade into collective control

If members vote on a host-controlled property, that property becomes collectively controlled from then on.

Example:

If members vote to rename a topic, the host can no longer rename that topic directly afterward.

The topic’s governance can evolve property by property:

```text
Name: collective
Icon: host-controlled
Expiration: host-controlled
Membership additions: host-controlled
Continuation: collective
```

Eventually, if every host-controlled capability becomes collective, the host effectively becomes just another member.

This fits the design well:

> The host helps establish the topic until the group takes over.

For v1, this transition should only move one way:

```text
Host-controlled → Collective
```

Do not allow moving control back to the host initially.

---

## Main screen

The main screen is intentionally simple.

It has:

- a leading search selector
- a search box
- a filtered topic list
- a contextual create-topic row at the bottom

Example:

```text
[Topics ▾] Search...

Topic list...

+ Create topic
```

The leading selector controls the grammar of the search box.

Possible selector modes:

- Topics
- People

Potentially later:

- Archived
- Mentions
- Unread

But for v1, Topics and People may be enough.

---

## Search behavior

### Topic mode

Topic mode behaves like normal text search.

The user types what they want to talk about.

Example:

```text
[Topics ▾] camping
```

The topic list filters instantly:

```text
Camping 2027
Weekend Camping
Camping Gear
```

The create row becomes:

```text
+ Create “camping”
```

In this mode, the search text becomes the new topic title if the user creates a topic.

### People mode

People mode behaves like an email recipient field.

The user types people’s names. If there is exactly one matching person, pressing space can automatically convert that person into a chip.

Example:

```text
[People ▾] Kevin 
```

becomes:

```text
[People ▾] [Kevin] |
```

Then the user can type:

```text
Alex 
```

which becomes:

```text
[People ▾] [Kevin] [Alex] |
```

The topic list then shows topics shared by the selected people.

Example:

```text
Topics with Kevin and Alex
- Camping 2027
- Friday Dinner
- Computers

+ New topic with Kevin and Alex
```

This is one of the app’s most important flows.

Instead of remembering which group chat contains which people, the user can select people and immediately see the topics they share.

---

## Creating a topic

### Create from Topic mode

If the selector is set to Topics, the search text becomes the title.

Example:

```text
[Topics ▾] camping
```

Action:

```text
+ Create “camping”
```

The user can then add members.

### Create from People mode

If the selector is set to People, selected chips become the initial members.

Example:

```text
[People ▾] [Kevin] [Alex]
```

Action:

```text
+ New topic with Kevin and Alex
```

The title is mandatory.

The topic can be renamed later.

### Duplicate prevention

If the user tries to create a topic with the same or similar title and the same or similar members, the app should warn them.

Example:

```text
A similar topic already exists:

Camping 2027
Kevin, Alex, Dana

Open existing
Create anyway
```

This should be a warning, not a hard database constraint.

Topics are loose on purpose, so the app should not enforce uniqueness strictly.

---

## Topic screen

A topic screen is a normal chat timeline.

It contains:

- messages
- activities
- system markers
- votes/proposals
- member changes
- continuation markers
- split/continued-from markers

Internally, messages and system events should probably be unified under an Activity model.

Activity types might include:

- message sent
- member joined
- member left
- topic renamed
- topic icon changed
- topic expiration changed
- proposal started
- proposal passed
- proposal failed
- topic continued elsewhere
- topic made read-only
- topic deleted
- user anonymized

Messages are one kind of activity.

This allows the topic timeline to explain its own history.

---

## Adding members

In the simplified model, members can always see the full topic history.

There is no partial history access and no MessageAccessGrant model in v1.

Because of that, adding a member must include a very clear warning:

```text
Kevin will be able to see the complete topic history, including messages sent before they joined.
```

The host can add members directly while membership additions are still host-controlled.

Other members must start a proposal/vote.

If the group has previously voted on membership additions, then adding members becomes collective, and even the host must start a vote.

When a member is added, the timeline should show:

```text
Kevin joined.
Kevin can see the complete topic history.
```

---

## Removing members

Removing a member is a serious action and should always require a vote.

The host should not be able to remove someone directly.

The removed member likely should not vote on their own removal.

Potential rule:

```text
REMOVE_MEMBER requires majority or supermajority approval.
Target member cannot vote.
```

For v1, choose one fixed threshold and keep it simple.

---

## Voting / proposals

The app should not build a fully generic governance engine at first.

Instead, use typed topic proposals.

Possible v1 proposal types:

```text
RENAME_TOPIC
CHANGE_ICON
SET_EXPIRATION
ADD_MEMBER
REMOVE_MEMBER
CONTINUE_IN_TOPIC
DELETE_TOPIC
```

Each proposal type has fixed backend rules.

A proposal has:

```text
TopicProposal
- id
- topic_id
- type
- proposed_by_user_id
- target_user_id nullable
- target_topic_id nullable
- proposed_value nullable
- status
- created_at
- expires_at
```

Votes have:

```text
TopicProposalVote
- proposal_id
- user_id
- approval
- voted_at
```

The backend owns all rules. Clients should not decide whether something is allowed.

---

## Governance categories

### Personal actions

No approval needed:

- leave topic
- mute topic
- block user
- archive topic for myself
- reveal a blocked message
- add someone to my network

### Host actions

Host can do directly unless that capability has become collective:

- rename topic
- change icon
- set expiration
- add member
- continue topic elsewhere / make read-only

Other members can propose these actions through a vote.

### Collective actions

Always require a vote:

- remove member
- delete topic
- platform escalation/report handling
- actions that affect another person’s content or membership negatively

---

## Topic continuation instead of merge

True merging is too complex and risky.

Instead of merging topics by moving messages, the app should support continuation.

Continuation means:

- Topic A becomes read-only.
- Topic A links to Topic B.
- Topic B gets a marker saying Topic A continued here.
- No messages are moved.
- No histories are merged.
- No permissions are combined.

Example in old topic:

```text
This topic is now read-only.
Conversation continues in “Camping 2027”.
```

Example in new topic:

```text
“Camping Gear” continued here.
```

Database fields could be simple:

```text
Topic
- read_only_at
- continued_to_topic_id
```

This replaces the idea of true merge for v1.

---

## Splitting / branching a topic

The simplified split model is:

> Create a new topic with a link to this point.

No messages are copied. No bridge messages. No synchronized read-only blocks.

From a message or activity, the user can start a new topic.

The original topic gets a marker:

```text
Discussion continued in “Camera Gear”.
```

The new topic gets a marker:

```text
Continued from “Camping 2027”.
View original context.
```

This gives users a way to branch a conversation without complex data movement.

---

## Blocking

Blocking should be simple in v1.

If Alex blocks Kevin, they can still share topics, but Alex does not see Kevin’s message content by default.

Example:

```text
Alex: What time are we leaving?
[blocked message from Kevin] [Show]
Dana: Sounds good.
```

Rules:

- blocked messages are hidden by default
- user can reveal an individual blocked message
- replies to blocked messages show as replies to hidden messages
- reactions from blocked users are hidden
- mentions from blocked users do not notify
- notification previews do not show blocked user message content
- search should not surface blocked user message content

This keeps blocking personal rather than structural.

Nobody gets removed from topics automatically.

---

## Account deletion / exit

For v1, there should only be two account exit options:

### Keep content

The user leaves the platform, but their messages remain attributed as-is.

### Anonymize content

The user’s identity is removed from prior content, but the conversation structure remains intact.

Messages might display as:

```text
Deleted user
```

For v1, avoid granular controls like separately choosing what happens to messages, attachments, reactions, replies, etc.

Keep the exit model simple.

---

## Topic expiration / archiving

Topics can have an optional expiration or auto-archive date.

This is useful for temporary conversations:

- dinner plans
- birthday planning
- one-off events
- trips
- weekend plans

The wording should probably be “auto-archive” rather than “expire,” because archive feels safer and less destructive.

Expired/archived topics are not deleted. They are simply sorted lower in the topics view.

---

## Topic relationships

Topic relationships are removed from v1.

No hierarchy.

No related topics.

No subtopics.

No parent/child topic structure.

The app should remain flat:

```text
Network → Topics
```

Topics are found through:

- title
- members
- recency
- unread state
- search
- archived/active status

This avoids accidentally becoming Discord or Slack.

---

## Privacy model

This is not a privacy-first encrypted secrecy app.

It is a friends app.

Privacy should be light and socially understandable.

The main rule is:

> If you want to exclude people, create a different topic.

For v1:

- members can see full topic history
- adding members warns clearly
- no hidden channels
- no server admins
- no global topic browsing
- blocks are personal
- topic-level decisions are visible in the timeline

The app should be honest about what it does instead of pretending to provide privacy guarantees it does not provide.

---

## Platform/moderation model

Even though there are no topic admins, platform-level moderation still exists separately.

Platform moderation handles things like:

- abuse reports
- illegal content
- spam
- account compromise
- platform limits
- safety enforcement

This should be separate from topic governance.

Topic governance is social.

Platform moderation is operational and safety-related.

---

## Data model v1

A lean v1 model could include:

```text
User
Connection
UserBlock

Topic
TopicMembership

Activity
Message
Attachment
Reaction

TopicProposal
TopicProposalVote

Notification
```

Potential later models:

```text
TopicContinuation
```

Though continuation can also be handled directly on Topic with:

```text
read_only_at
continued_to_topic_id
```

Avoid for v1:

```text
MessageAccessGrant
TopicRelationship
TopicBridge
TopicBridgeActivity
Full merge model
Granular account deletion model
```

---

## Possible table concepts

### User

```text
User
- id
- phone_number
- display_name
- username
- avatar_url
- created_at
- anonymized_at
```

Accounts are tied to phone numbers, and 2FA should be enforced.

Clicking a user can show the phone number behind the account, since this is intended for people who already know each other.

### Connection

```text
Connection
- user_id
- connected_user_id
- source
- created_at
```

Possible sources:

```text
direct
phone_contact
shared_topic
friend_of_friend
```

### UserBlock

```text
UserBlock
- blocker_user_id
- blocked_user_id
- created_at
```

### Topic

```text
Topic
- id
- title
- icon
- host_user_id
- created_by_user_id
- created_at
- updated_at
- last_activity_at
- expires_at
- archived_at
- read_only_at
- continued_to_topic_id
```

The host is the current host while host powers remain relevant.

If all capabilities become collective, the UI may stop showing a host.

### TopicMembership

```text
TopicMembership
- topic_id
- user_id
- joined_at
- left_at
```

No message visibility ranges in v1.

Members see full topic history.

### Activity

```text
Activity
- id
- topic_id
- type
- actor_user_id
- created_at
```

Activity is the timeline backbone.

### Message

```text
Message
- id
- activity_id
- topic_id
- sender_user_id
- body
- created_at
- edited_at
- deleted_at
```

Messages can be edited and deleted.

Deleted messages leave tombstones.

### Attachment

```text
Attachment
- id
- message_id
- uploaded_by_user_id
- file_url
- file_type
- created_at
- deleted_at
```

### Reaction

```text
Reaction
- id
- message_id
- user_id
- emoji
- created_at
```

### TopicProposal

```text
TopicProposal
- id
- topic_id
- type
- proposed_by_user_id
- target_user_id nullable
- target_topic_id nullable
- proposed_value nullable
- status
- created_at
- expires_at
```

### TopicProposalVote

```text
TopicProposalVote
- proposal_id
- user_id
- approval
- voted_at
```

### TopicGovernance

Optional, but useful if host-controlled capabilities can become collective:

```text
TopicGovernance
- topic_id
- capability
- control_mode
- changed_at
- changed_by_proposal_id
```

Example capabilities:

```text
RENAME_TOPIC
CHANGE_ICON
SET_EXPIRATION
ADD_MEMBER
CONTINUE_IN_TOPIC
```

Control modes:

```text
HOST
COLLECTIVE
```

---

## Mobile/web strategy

The app should be mobile-first and mobile-browser-first.

There is no need to design a desktop experience initially.

Recommended technical direction:

```text
Expo
React Native
React Native Web
Expo Router
TypeScript
```

This allows one codebase to target:

- Android app
- iOS app
- mobile browser

The browser version matters because users can join through a link without installing anything. That can reduce adoption friction, similar to the early advantage of web-accessible chat platforms.

The native apps later provide better:

- push notifications
- app badges
- camera access
- media picker
- share sheet
- deep links
- keyboard behavior
- smoother gestures

Because the product is mobile-only, the web version can simply be a phone-sized layout in the browser.

---

## Core user flows

### Flow 1: Find topic by subject

```text
Open app
→ selector is Topics
→ type “camping”
→ topic list filters
→ tap Camping 2027
```

If no topic exists:

```text
→ tap + Create “camping”
→ choose members
→ topic opens
```

### Flow 2: Find topic by people

```text
Open app
→ switch selector to People
→ type Kevin
→ press space
→ Kevin becomes chip
→ type Alex
→ press space
→ Alex becomes chip
→ list shows topics shared with Kevin and Alex
→ open existing topic
```

If no topic exists:

```text
→ tap + New topic with Kevin and Alex
→ optional title
→ topic opens
```

### Flow 4: Host adds a member

```text
Host opens topic actions
→ Add member
→ selects Kevin
→ warning appears:
   “Kevin will be able to see the complete topic history.”
→ host confirms
→ Kevin joins
→ timeline marker appears
```

If adding members has become collective:

```text
→ proposal is created instead
→ members vote
→ if approved, Kevin joins
```

### Flow 5: Non-host proposes adding a member

```text
Member opens topic actions
→ Add member
→ selects Kevin
→ warning appears
→ proposal starts
→ members vote
→ if approved, Kevin joins
```

### Flow 6: Rename topic

If host-controlled:

```text
Host renames topic directly
→ timeline records rename
```

If non-host:

```text
Member proposes rename
→ vote starts
→ if approved, topic is renamed
→ rename capability becomes collective
```

After that:

```text
Future renames require votes, including by the host.
```

### Flow 7: Continue topic elsewhere

```text
Host chooses Continue elsewhere
→ selects or creates target topic
→ old topic becomes read-only
→ old topic links to target topic
→ target topic gets continuation marker
```

If continuation has become collective, this requires a proposal.

### Flow 8: Split conversation lightly

```text
User long-presses message/activity
→ chooses Start new topic from here
→ selects members/title
→ new topic opens with:
   “Continued from Camping 2027”
→ original topic gets:
   “Continued in Camera Gear”
```

No messages are copied.

### Flow 9: Blocked user in shared topic

```text
Alex blocks Kevin
→ shared topics remain shared
→ Kevin’s messages are hidden for Alex
```

Alex sees:

```text
[blocked message from Kevin] [Show]
```

Notifications and search do not reveal Kevin’s hidden message content.

### Flow 10: Account exit

```text
User chooses leave platform
→ choose:
   Keep my content
   Anonymize my content
```

If anonymized:

```text
Messages remain, but sender becomes Deleted user.
```

---

## Current most complex concept

The most complex remaining concept is governance:

- host actions
- collective proposals
- voting thresholds
- capability control modes
- host power fading over time
- host succession if the host leaves
- what happens when an action is proposed, approved, rejected, or expires

To keep this manageable:

- use fixed proposal types
- use fixed backend rules
- avoid customizable voting systems
- avoid true merges
- avoid partial message visibility
- avoid topic hierarchy
- avoid copied bridge messages

The app should not become a governance platform. Governance should only appear when the structure of a topic changes.

---

## Simplified v1 product

The strongest v1 is:

```text
One network.
Flat topics.
Mobile-first search.
Topic/People search selector.
People chips.
Contextual topic creation.
Host-led setup.
Votes only when needed.
Full-history membership.
Simple blocking.
Simple continuation.
Simple account anonymization.
No hierarchy.
No true merge.
No copied message splitting.
No partial message visibility.
```

The end-user experience should feel like:

```text
Open app.
Search what you want to talk about, or who you want to talk with.
Open the right topic, or create one.
Chat.
```

All complexity should stay behind that simple loop.
