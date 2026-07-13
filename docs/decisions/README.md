# Architecture Decision Records

Architecture Decision Records document significant project decisions and their tradeoffs.

Do not create an ADR for every implementation detail. Use ADRs when a decision is hard to reverse, affects multiple features, introduces a dependency, changes architecture, or intentionally deviates from Material Design 3 or existing project standards.

## What Belongs In An ADR

- The decision being made.
- The context that made the decision necessary.
- Considered options.
- The chosen option.
- Consequences and tradeoffs.
- Follow-up work, if any.

## What Does Not Belong In An ADR

- Step-by-step implementation notes.
- Temporary task plans.
- Minor component choices.
- Bug reports.
- Changelog entries.
- Decisions already covered by project standards.

## Naming

Use:

```text
NNNN-short-kebab-case-title.md
```

Example:

```text
0001-api-service-boundary.md
```

Use the next available number. Keep titles stable after creation.

## Length

Keep ADRs short. One to two pages is enough for most decisions. Prefer clear tradeoffs over exhaustive history.
