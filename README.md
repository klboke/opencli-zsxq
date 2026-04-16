# opencli-zsxq

`opencli-zsxq` is a private OpenCLI plugin for Knowledge Planet (`zsxq.com`).

For Chinese documentation, see [README.cn.md](./README.cn.md).

It reuses your existing Chrome login session through OpenCLI's Browser Bridge and currently provides:

- `opencli zsxq needs-reply [--group <id>] [--count N]`
- `opencli zsxq group-list`
- `opencli zsxq group-topics [--group <id>]`
- `opencli zsxq me`
- `opencli zsxq topic <topic_id|url>`
- `opencli zsxq comment-list <topic_id|url>`
- `opencli zsxq comment-dump <topic_id|url>`
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

## Usage

Examples below use `opencli ...` directly. If you do not have it installed globally, replace `opencli` with:

```bash
npx -y -p @jackwener/opencli opencli
```

Default group id in this repository is `48844125114258` (`KK开源社区`).
When a command supports `--group` and you omit it, the plugin resolves group id in this order:

1. Browser `target_group`
2. Default group `48844125114258`
3. First result from `managed_groups`

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
opencli zsxq needs-reply --group 48844125114258 --count 50
```

List latest topics from the current managed group, or an explicit group id:

```bash
opencli zsxq group-topics --count 10
opencli zsxq group-topics --group 48844125114258 --scope digests --count 20
```

Read a topic by id or URL:

```bash
opencli zsxq topic 14422522551548812
opencli zsxq topic https://wx.zsxq.com/group/48844125114258/topic/14422522551548812
opencli zsxq topic https://t.zsxq.com/7N1rp
```

List topic comments:

```bash
opencli zsxq comment-list https://t.zsxq.com/7N1rp --count 30 --include-sticky
```

Dump as many comments as possible for a topic:

```bash
opencli zsxq comment-dump https://t.zsxq.com/7N1rp
opencli zsxq comment-dump https://t.zsxq.com/7N1rp --count 50 --max-pages 40
```

Reply to a topic:

```bash
opencli zsxq reply 14422522551548812 --text "收到，我看一下。" --execute
opencli zsxq reply https://t.zsxq.com/7N1rp --file ./reply.md --execute
```

Create a topic:

```bash
opencli zsxq topic-create --group 48844125114258 --text "新公告" --execute
opencli zsxq topic-create --file ./topic.md --execute
```

Moderation and curation actions:

```bash
opencli zsxq topic-sticky https://t.zsxq.com/7N1rp on --execute
opencli zsxq topic-digest 14422522551548812 on --execute
opencli zsxq topic-delete 14422522551548812 --execute
opencli zsxq comment-delete 2852411842424181 --execute
opencli zsxq comment-delete 2852411842424181 --reason custom --description "广告" --execute
```

`reply`, `topic-create`, `topic-sticky`, `topic-digest`, `topic-delete`, and `comment-delete` require `--execute` by design so dry runs do not accidentally mutate community data.

## Notes

- Requests are signed inside the live browser session.
- Credentials stay in the browser; this plugin does not store Knowledge Planet passwords.
- The current implementation targets the signed web API used by `wx.zsxq.com`.
- When `--group` is omitted, the plugin first tries browser `target_group`, then falls back to default group `48844125114258`, then the first group returned by `managed_groups`.

## Current Needs-Reply Rules

`needs-reply` intentionally uses simple and explicit heuristics. A topic is currently flagged when:

1. The topic is not authored by the current logged-in account, unless `--include-self-topics` is passed.
2. Either `comments_count = 0`.
3. Or comments exist, but the latest preview comment in `show_comments[0]` is not from the current logged-in account.
4. Or comments exist but the preview comment is missing, in which case it is conservatively flagged.

Current `reason` values:

- `no_comments`
- `latest_comment_not_mine`
- `comments_exist_but_preview_missing`

This rule set is intentionally conservative: it prefers surfacing candidate topics for manual review over trying to infer semantic intent.
