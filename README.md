# opencli-zsxq

`opencli-zsxq` is an open-source OpenCLI plugin for Knowledge Planet (`zsxq.com`).

For Chinese documentation, see [README.cn.md](./README.cn.md).

License: [MIT](./LICENSE)

It reuses your existing Chrome login session through OpenCLI's Browser Bridge and currently provides:

- `opencli zsxq needs-reply [--group <id>] [--count N]`
- `opencli zsxq group-list`
- `opencli zsxq group-topics [--group <id>]`
- `opencli zsxq me`
- `opencli zsxq topic <topic_id|url>`
- `opencli zsxq topic-images <topic_id|url>`
- `opencli zsxq topic-files <topic_id|url>`
- `opencli zsxq comment-list <topic_id|url>`
- `opencli zsxq comment-dump <topic_id|url>`
- `opencli zsxq file-download <file_id> [--output-dir dir]`
- `opencli zsxq reply <topic_id|url> --text "..." --execute`
- `opencli zsxq topic-create [--group <id>] --text "..." --execute`
- `opencli zsxq topic-sticky <topic_id|url> on|off --execute`
- `opencli zsxq topic-digest <topic_id|url> on|off --execute`
- `opencli zsxq topic-delete <topic_id|url> --execute`
- `opencli zsxq comment-delete <comment_id> --execute`

## Prerequisites

- Node.js `>= 21`
- Chrome/Chromium logged into Knowledge Planet
- OpenCLI installed and the Browser Bridge extension enabled

Verify browser connectivity first:

```bash
opencli doctor
```

If you do not have a global `opencli` binary, use:

```bash
npx -y -p @jackwener/opencli opencli doctor
```

## Install As A Local Plugin

From this repository:

```bash
opencli plugin install .
```

Or from GitHub:

```bash
opencli plugin install github:klboke/opencli-zsxq
```

If you use `npx`, the package name is `@jackwener/opencli`, not `opencli`:

```bash
npx -y -p @jackwener/opencli opencli plugin install /absolute/path/to/opencli-zsxq
npx -y -p @jackwener/opencli opencli plugin install github:klboke/opencli-zsxq
```

## Bundled AI Skill

This repository also contains a versioned Codex skill at [skills/zsxq-ops/SKILL.md](./skills/zsxq-ops/SKILL.md).

It is meant to help AI agents run community maintenance workflows consistently on top of the plugin.
If you want Codex to auto-discover it locally, copy or symlink `skills/zsxq-ops` into `~/.codex/skills/zsxq-ops`.

## Usage

Examples below use `opencli ...` directly. If you do not have it installed globally, replace `opencli` with:

```bash
npx -y -p @jackwener/opencli opencli
```

When a command supports `--group` and you omit it, the plugin resolves group id in this order:

1. Browser `target_group`
2. First result from `managed_groups`

Check the current logged-in browser account:

```bash
opencli zsxq me
```

List the groups you can manage:

```bash
opencli zsxq group-list
```

List recent topics that likely need a reply:

```bash
opencli zsxq needs-reply --count 20
opencli zsxq needs-reply --group <group_id> --count 50
```

The output now includes topic publish time in `create_time` so you can triage candidates by age.

List latest topics from the current managed group, or an explicit group id:

```bash
opencli zsxq group-topics --count 10
opencli zsxq group-topics --group <group_id> --scope digests --count 20
```

Read a topic by id or URL:

```bash
opencli zsxq topic <topic_id>
opencli zsxq topic https://wx.zsxq.com/group/<group_id>/topic/<topic_id>
opencli zsxq topic https://t.zsxq.com/<short_code>
```

The topic output now includes `image_count` and `image_urls` when the topic body contains screenshots or other inline images.
It also includes `file_count` and `file_names` when the topic body contains attachments.

List image assets from a topic:

```bash
opencli zsxq topic-images https://t.zsxq.com/<short_code>
opencli zsxq topic-images https://t.zsxq.com/<short_code> --include-comments false
```

List attachment assets from a topic:

```bash
opencli zsxq topic-files https://t.zsxq.com/<short_code>
opencli zsxq topic-files https://t.zsxq.com/<short_code> --include-comments false
```

Download an attachment by `file_id`:

```bash
opencli zsxq file-download <file_id> --output-dir ./downloads
```

List topic comments:

```bash
opencli zsxq comment-list https://t.zsxq.com/<short_code> --count 30 --include-sticky
```

`comment-list` and `comment-dump` now also include `image_count` and `image_urls` for comment images when present.
They also include `file_count` and `file_names` for comment attachments when present.

Dump as many comments as possible for a topic:

```bash
opencli zsxq comment-dump https://t.zsxq.com/<short_code>
opencli zsxq comment-dump https://t.zsxq.com/<short_code> --count 50 --max-pages 40
```

Note: the current Knowledge Planet comments API only accepts page sizes up to `30`.
If you pass a larger `--count`, the plugin automatically clamps it to `30`.

Reply to a topic:

```bash
opencli zsxq reply 14422522551548812 --text "收到，我看一下。" --execute
opencli zsxq reply https://t.zsxq.com/<short_code> --file ./reply.md --execute
```

For automation calls, `--text` now treats literal `\n` / `\r\n` escape sequences as real line breaks when no real newline is present yet.

Create a topic:

```bash
opencli zsxq topic-create --group <group_id> --text "New topic" --execute
opencli zsxq topic-create --file ./topic.md --execute
```

Moderation and curation actions:

```bash
opencli zsxq topic-sticky https://t.zsxq.com/<short_code> on --execute
opencli zsxq topic-digest <topic_id> on --execute
opencli zsxq topic-delete <topic_id> --execute
opencli zsxq comment-delete <comment_id> --execute
opencli zsxq comment-delete <comment_id> --reason custom --description "spam" --execute
```

`reply`, `topic-create`, `topic-sticky`, `topic-digest`, `topic-delete`, and `comment-delete` require `--execute` by design so dry runs do not accidentally mutate community data.

## Notes

- Requests are signed inside the live browser session.
- Credentials stay in the browser; this plugin does not store Knowledge Planet passwords.
- The current implementation targets the signed web API used by `wx.zsxq.com`.
- When `--group` is omitted, the plugin first tries browser `target_group`, then falls back to the first group returned by `managed_groups`.

## Current Needs-Reply Rules

`needs-reply` intentionally uses simple and explicit heuristics. A topic is currently flagged when:

1. The topic is not authored by the current logged-in account, unless `--include-self-topics` is passed.
2. Topics authored by community staff are skipped.
3. Either `comments_count = 0`.
4. Or comments exist, but the latest preview comment in `show_comments` is not from the current logged-in account.
5. Or comments exist but the preview comment is missing, in which case it is conservatively flagged.
6. If `show_comments.length < comments_count`, the plugin fetches paginated comments and re-evaluates using the true latest comment.

The plugin also reads `groups/{group_id}` and treats the following identities as community staff:

- group owner `owner`
- admins from `admin_ids`
- partners from `partner_ids`

If the latest comment is from any of those staff users, the topic is treated as already followed up and is excluded from `needs-reply`.

Current `reason` values:

- `no_comments`
- `latest_comment_not_mine`
- `comments_exist_but_preview_missing`

This rule set is intentionally conservative: it prefers surfacing candidate topics for manual review over trying to infer semantic intent.
