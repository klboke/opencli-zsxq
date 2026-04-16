# opencli-zsxq

`opencli-zsxq` is a private OpenCLI plugin for Knowledge Planet (`zsxq.com`).

It reuses your existing Chrome login session through OpenCLI's Browser Bridge and currently provides:

- `opencli zsxq group-list`
- `opencli zsxq group-topics [--group <id>]`
- `opencli zsxq me`
- `opencli zsxq topic <topic_id|url>`
- `opencli zsxq comment-list <topic_id|url>`
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

## Install As A Local Plugin

From this repository:

```bash
opencli plugin install .
```

Or from GitHub:

```bash
opencli plugin install github:klboke/opencli-zsxq
```

## Usage

Check the current logged-in browser account:

```bash
opencli zsxq me
```

List the groups you can manage:

```bash
opencli zsxq group-list
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
- When `--group` is omitted, the plugin first tries browser `target_group`, then falls back to the first group returned by `managed_groups`.
