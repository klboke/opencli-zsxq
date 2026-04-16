# opencli-zsxq

`opencli-zsxq` 是一个用于知识星球（`zsxq.com`）的开源 OpenCLI 插件，覆盖帖子与评论操作、图片与附件提取，以及社区维护流程。

协议：[MIT](./LICENSE)

它会复用你当前 Chrome/Chromium 已登录的知识星球会话，通过 OpenCLI Browser Bridge 在浏览器上下文里完成签名请求和常见社区维护动作。

## 当前支持的命令

- `opencli zsxq me`
- `opencli zsxq needs-reply [--group <id>] [--count N]`
- `opencli zsxq group-list`
- `opencli zsxq group-topics [--group <id>] [--scope all|digests] [--count N]`
- `opencli zsxq topic <topic_id|url>`
- `opencli zsxq topic-images <topic_id|url>`
- `opencli zsxq topic-files <topic_id|url>`
- `opencli zsxq comment-list <topic_id|url> [--count N] [--include-sticky]`
- `opencli zsxq comment-dump <topic_id|url> [--count N] [--max-pages N]`
- `opencli zsxq file-download <file_id> [--output-dir dir]`
- `opencli zsxq reply <topic_id|url> --text "..." --execute`
- `opencli zsxq topic-create [--group <id>] --text "..." --execute`
- `opencli zsxq topic-sticky <topic_id|url> on|off --execute`
- `opencli zsxq topic-digest <topic_id|url> on|off --execute`
- `opencli zsxq topic-delete <topic_id|url> --execute`
- `opencli zsxq comment-delete <comment_id> --execute`

## 前置条件

- Node.js `>= 21`
- Chrome/Chromium 已登录知识星球
- 已安装并启用 OpenCLI Browser Bridge 扩展

先检查 OpenCLI 和浏览器桥接是否可用：

```bash
opencli doctor
```

如果你没有全局安装 `opencli` 命令，需要改用：

```bash
npx -y -p @jackwener/opencli opencli doctor
```

注意：npm 上的包名是 `@jackwener/opencli`，不是 `opencli`。

## 安装插件

### 方式一：从本地目录安装

```bash
opencli plugin install /absolute/path/to/opencli-zsxq
```

如果你用的是 `npx`：

```bash
npx -y -p @jackwener/opencli opencli plugin install /absolute/path/to/opencli-zsxq
```

### 方式二：从 GitHub 安装

```bash
opencli plugin install github:klboke/opencli-zsxq
```

如果你用的是 `npx`：

```bash
npx -y -p @jackwener/opencli opencli plugin install github:klboke/opencli-zsxq
```

## 仓库内置 AI Skill

仓库里也带了一份可版本化维护的 Codex skill：
[skills/zsxq-ops/SKILL.md](./skills/zsxq-ops/SKILL.md)

这份 skill 用来让 AI 在调用插件时按统一流程做社区维护。
如果你希望 Codex 在本机自动发现它，可以把 `skills/zsxq-ops` 复制或软链到：
`~/.codex/skills/zsxq-ops`

## 用法

下面默认直接写 `opencli ...`。如果你没有全局安装，请统一替换成：

```bash
npx -y -p @jackwener/opencli opencli
```

凡是支持 `--group` 的命令，如果你没有显式传入群号，插件会按下面顺序解析：

1. 浏览器本地的 `target_group`
2. `managed_groups` 返回列表里的第一个星球

### 1. 查看当前登录账号

```bash
opencli zsxq me
```

### 2. 查看当前可管理的星球

```bash
opencli zsxq group-list
```

### 3. 查看“可能需要回复”的帖子

```bash
opencli zsxq needs-reply --count 20
opencli zsxq needs-reply --group <group_id> --count 50
```

返回列里会包含发帖时间 `create_time`，方便你按发布时间判断是否需要优先跟进。

当前筛选规则是固定且显式的，命令会把符合下面任一条件的话题标出来：

1. 话题作者不是当前登录账号
2. 默认会跳过自己发的话题；如果要把自己发的话题也纳入筛选，可以加 `--include-self-topics`
3. 如果话题作者属于社区运营侧身份，也就是群主 / 管理员 / 合伙人，也会直接跳过
4. `comments_count = 0`
5. 或者有评论，但 `show_comments` 里的最后一条最新评论预览不是当前登录账号发的
6. 或者明明有评论，但接口没有返回最新评论预览，这种情况也会保守地标出来
7. 如果发现 `show_comments` 条数少于 `comments_count`，插件会继续拉评论分页，拿真实最后一条评论再判断

另外，插件会额外读取群详情接口 `groups/{group_id}`。如果最新评论作者属于社区运营侧身份，也就是以下任一身份：

- 群主 `owner`
- 管理员 `admin_ids`
- 合伙人 `partner_ids`

则视为“社区已跟进”，不会再出现在 `needs-reply` 结果里。

当前 `reason` 字段含义：

- `no_comments`
- `latest_comment_not_mine`
- `comments_exist_but_preview_missing`

这个规则集是偏保守的，目标是先把疑似需要处理的话题筛出来，再由你人工判断。

### 4. 查看星球帖子列表

查看默认目标星球最近 10 条：

```bash
opencli zsxq group-topics --count 10
```

指定星球：

```bash
opencli zsxq group-topics --group <group_id> --count 10
```

只看精华帖：

```bash
opencli zsxq group-topics --group <group_id> --scope digests --count 10
```

带时间游标：

```bash
opencli zsxq group-topics --group <group_id> --count 20 --begin-time 2026-04-15T00:00:00.000+0800
opencli zsxq group-topics --group <group_id> --count 20 --end-time 2026-04-15T23:59:59.000+0800
```

### 5. 查看单条帖子详情

支持三种输入：

- 纯 `topic_id`
- `wx.zsxq.com` 完整链接
- `t.zsxq.com` 短链接

```bash
opencli zsxq topic <topic_id>
opencli zsxq topic https://wx.zsxq.com/group/<group_id>/topic/<topic_id>
opencli zsxq topic https://t.zsxq.com/<short_code>
```

如果帖子正文里带有截图或其他内嵌图片，`topic` 输出里现在会带：

- `image_count`
- `image_urls`

如果帖子正文里带有附件，`topic` 输出里还会带：

- `file_count`
- `file_names`

### 5.1 查看帖子里的图片资源

```bash
opencli zsxq topic-images https://t.zsxq.com/<short_code>
opencli zsxq topic-images https://t.zsxq.com/<short_code> --include-comments false
```

### 5.2 查看帖子和评论里的附件

```bash
opencli zsxq topic-files https://t.zsxq.com/<short_code>
opencli zsxq topic-files https://t.zsxq.com/<short_code> --include-comments false
```

按 `file_id` 下载附件到本地目录：

```bash
opencli zsxq file-download <file_id> --output-dir ./downloads
```

### 6. 查看帖子评论

```bash
opencli zsxq comment-list https://t.zsxq.com/<short_code> --count 30
opencli zsxq comment-list https://t.zsxq.com/<short_code> --count 30 --include-sticky
```

`comment-list` 和 `comment-dump` 现在也会在评论包含图片时返回：

- `image_count`
- `image_urls`

如果评论包含附件，还会返回：

- `file_count`
- `file_names`

分页时可带 `begin-time`：

```bash
opencli zsxq comment-list https://t.zsxq.com/<short_code> --count 30 --begin-time 2026-04-16T00:00:00.000+0800
```

### 7. 拉取一个话题尽量完整的评论内容

```bash
opencli zsxq comment-dump https://t.zsxq.com/<short_code>
opencli zsxq comment-dump https://t.zsxq.com/<short_code> --count 50 --max-pages 40
```

`comment-dump` 会循环走评论分页接口，尽量把一个话题下的评论内容拉全，适合后续归档、分析或离线处理。
注意：当前知识星球评论接口单页 `count` 上限是 `30`。如果你传了更大的值，插件会自动钳制到 `30`。

### 8. 回复帖子

直接传文本：

```bash
opencli zsxq reply https://t.zsxq.com/<short_code> --text "收到，我看一下。" --execute
```

如果自动化链路传进来的 `--text` 里是字面量 `\n` / `\r\n`，插件现在会在没有真实换行时把它们转成真正的多行文本。

从文件读取回复内容：

```bash
opencli zsxq reply https://t.zsxq.com/<short_code> --file ./reply.md --execute
```

### 9. 创建帖子

直接传文本：

```bash
opencli zsxq topic-create --group <group_id> --text "新公告" --execute
```

从文件读取：

```bash
opencli zsxq topic-create --file ./topic.md --execute
```

如果不传 `--group`，插件会先尝试浏览器里的 `target_group`，取不到时再回退到 `managed_groups` 里的第一个星球。

### 10. 置顶/取消置顶

```bash
opencli zsxq topic-sticky https://t.zsxq.com/<short_code> on --execute
opencli zsxq topic-sticky https://t.zsxq.com/<short_code> off --execute
```

### 11. 加精/取消精华

```bash
opencli zsxq topic-digest https://t.zsxq.com/<short_code> on --execute
opencli zsxq topic-digest https://t.zsxq.com/<short_code> off --execute
```

### 12. 删除帖子

```bash
opencli zsxq topic-delete https://t.zsxq.com/<short_code> --execute
```

### 13. 删除评论

直接删除：

```bash
opencli zsxq comment-delete <comment_id> --execute
```

带删除原因：

```bash
opencli zsxq comment-delete <comment_id> --reason spam --execute
```

自定义原因说明：

```bash
opencli zsxq comment-delete <comment_id> --reason custom --description "广告" --execute
```

## 安全约束

以下命令都必须显式加 `--execute` 才会真正写入线上数据：

- `reply`
- `topic-create`
- `topic-sticky`
- `topic-digest`
- `topic-delete`
- `comment-delete`

不带 `--execute` 时，命令会直接拒绝执行，避免误操作。

## 说明

- 所有请求都在浏览器已登录会话内完成签名，不会把知识星球密码存到插件里。
- 当前实现基于 `wx.zsxq.com` 使用的签名 Web API。
- 如果命令执行异常，优先检查：
  - Chrome 是否仍处于登录状态
  - Browser Bridge 扩展是否启用
  - `opencli doctor` 是否正常
