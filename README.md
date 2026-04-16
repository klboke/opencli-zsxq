# opencli-zsxq

`opencli-zsxq` is a private OpenCLI plugin for Knowledge Planet (`zsxq.com`).

It reuses your existing Chrome login session through OpenCLI's Browser Bridge and currently provides:

- `opencli zsxq me`
- `opencli zsxq topic <topic_id|url>`
- `opencli zsxq reply <topic_id|url> --text "..." --execute`

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

Read a topic by id or URL:

```bash
opencli zsxq topic 14422522551548812
opencli zsxq topic https://wx.zsxq.com/group/48844125114258/topic/14422522551548812
opencli zsxq topic https://t.zsxq.com/7N1rp
```

Reply to a topic:

```bash
opencli zsxq reply 14422522551548812 --text "收到，我看一下。" --execute
opencli zsxq reply https://t.zsxq.com/7N1rp --file ./reply.md --execute
```

`reply` requires `--execute` by design so dry runs do not accidentally post content.

## Notes

- Requests are signed inside the live browser session.
- Credentials stay in the browser; this plugin does not store Knowledge Planet passwords.
- The current implementation targets the signed web API used by `wx.zsxq.com`.
