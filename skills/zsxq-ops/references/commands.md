# ZSXQ Commands

## Verify Environment

```bash
opencli doctor
opencli plugin install /Users/kl/.paseo/worktrees/1t1obik0/opencli-zsxq
```

`npx` fallback:

```bash
npx -y -p @jackwener/opencli opencli doctor
npx -y -p @jackwener/opencli opencli plugin install /Users/kl/.paseo/worktrees/1t1obik0/opencli-zsxq
```

## Read Commands

```bash
opencli zsxq me
opencli zsxq group-list
opencli zsxq group-topics --group <group_id> --count 10
opencli zsxq needs-reply --group <group_id> --count 20
opencli zsxq topic https://t.zsxq.com/<short_code>
opencli zsxq topic-images https://t.zsxq.com/<short_code>
opencli zsxq topic-files https://t.zsxq.com/<short_code>
opencli zsxq comment-list https://t.zsxq.com/<short_code> --count 30 --include-sticky
opencli zsxq comment-dump https://t.zsxq.com/<short_code> --count 30 --max-pages 20
opencli zsxq file-download <file_id> --output-dir ./downloads
```

## Write Commands

```bash
opencli zsxq reply https://t.zsxq.com/<short_code> --text "收到，我看一下。" --execute
opencli zsxq topic-create --group <group_id> --text "New topic" --execute
opencli zsxq topic-sticky https://t.zsxq.com/<short_code> on --execute
opencli zsxq topic-digest https://t.zsxq.com/<short_code> on --execute
opencli zsxq topic-delete https://t.zsxq.com/<short_code> --execute
opencli zsxq comment-delete <comment_id> --execute
```

## Interpretation Notes

- Prefer `comment-dump` over `comment-list` when judging whether a thread is already resolved.
- Use `topic-images` when the user explicitly asks for screenshot/image URLs from a topic thread.
- Use `topic-files` and `file-download` when the user asks for attached documents or wants them saved locally.
- `needs-reply` is a candidate generator, not a semantic answerer.
- Topic links can be full `wx.zsxq.com` URLs, `t.zsxq.com` short links, or raw topic IDs.
- Omit `--group` when browser `target_group` already points at the group you want.
