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
opencli zsxq group-topics --group 48844125114258 --count 10
opencli zsxq needs-reply --group 48844125114258 --count 20
opencli zsxq topic https://t.zsxq.com/7N1rp
opencli zsxq topic-images https://t.zsxq.com/7N1rp
opencli zsxq comment-list https://t.zsxq.com/7N1rp --count 30 --include-sticky
opencli zsxq comment-dump https://t.zsxq.com/7N1rp --count 30 --max-pages 20
```

## Write Commands

```bash
opencli zsxq reply https://t.zsxq.com/7N1rp --text "收到，我看一下。" --execute
opencli zsxq topic-create --group 48844125114258 --text "新公告" --execute
opencli zsxq topic-sticky https://t.zsxq.com/7N1rp on --execute
opencli zsxq topic-digest https://t.zsxq.com/7N1rp on --execute
opencli zsxq topic-delete https://t.zsxq.com/7N1rp --execute
opencli zsxq comment-delete 2852411842424181 --execute
```

## Interpretation Notes

- Prefer `comment-dump` over `comment-list` when judging whether a thread is already resolved.
- Use `topic-images` when the user explicitly asks for screenshot/image URLs from a topic thread.
- `needs-reply` is a candidate generator, not a semantic answerer.
- Topic links can be full `wx.zsxq.com` URLs, `t.zsxq.com` short links, or raw topic IDs.
- Default group is `48844125114258`.
