---
name: zsxq-ops
description: Operate Knowledge Planet community workflows through the local opencli-zsxq plugin. Use when Codex needs to triage candidate topics, inspect posts and full comment threads, draft or send replies, or run moderation actions for a managed Knowledge Planet group.
---

# ZSXQ Ops

Use this skill with the local `opencli-zsxq` plugin for Knowledge Planet community work.

## Quick Start

Prefer `opencli ...` if the binary is installed. Otherwise use:

```bash
npx -y -p @jackwener/opencli opencli
```

Before using the plugin:

1. Run `opencli doctor` to confirm Browser Bridge is connected.
2. If the `zsxq` commands are unavailable, install the plugin from the local checkout:
   `/Users/kl/.paseo/worktrees/1t1obik0/opencli-zsxq`
3. If `--group` is omitted, the plugin uses browser `target_group` first, then falls back to the first managed group.

For install and command examples, read [references/commands.md](references/commands.md).

## Triage Workflow

For “哪些帖子需要跟进” style requests:

1. Run `opencli zsxq needs-reply --group <group_id> --count <N>`.
2. Treat the result as a candidate list, not a final decision.
3. For each candidate worth checking, read:
   `opencli zsxq topic <topic>`
4. If reply context matters, dump the full thread:
   `opencli zsxq comment-dump <topic> --count 30 --max-pages 20`

Current `needs-reply` behavior is already opinionated:

- Skip topics authored by the current logged-in account unless `--include-self-topics` is requested.
- Skip topics authored by community staff.
- Skip topics whose true latest reply is from community staff.
- Mark `comments_count = 0` as `no_comments`.
- Mark topics whose true latest reply is not from the current logged-in account as `latest_comment_not_mine`.
- Re-fetch topic details if preview comments are missing.
- Re-fetch paginated comments when `show_comments` is truncated so the true latest reply is used.

Community staff means any of:

- group owner `owner`
- admins from `admin_ids`
- partners from `partner_ids`

## Reply Workflow

When the user asks to follow up on a specific topic:

1. Read the topic first.
2. Read the full comment thread before drafting a reply when the topic already has discussion.
3. Draft a concise reply that answers the latest unresolved point.
4. Only send with `--execute` when the user explicitly asks to post, or when the thread context already makes execution clearly authorized.

Use these write actions carefully:

- `reply`
- `topic-create`
- `topic-sticky`
- `topic-digest`
- `topic-delete`
- `comment-delete`

## Moderation Workflow

For cleanup or curation work:

1. Inspect the topic or comment first.
2. Prefer read commands before any mutation.
3. Use destructive commands only with explicit user intent in the current thread.
4. Preserve topic URLs, topic IDs, comment IDs, and timestamps in your report back.

## Reporting Back

When you complete a community action, include:

- topic URL or topic ID
- what you inspected
- what you posted or changed
- resulting `comment_id` or `topic_id` for write actions
- any remaining ambiguity
