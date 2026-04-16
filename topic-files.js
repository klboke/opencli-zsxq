import { cli, Strategy } from './opencli-compat.js';

import {
  getCommentFiles,
  getTopicFiles,
  getTopicId,
  getTopicOwner,
  normalizeCommentPageSize,
  normalizeFileRows,
  readAllTopicComments,
  readFileDownloadUrl,
  readTopicDetails,
  requireBrowserSession,
  resolveTopicReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'topic-files',
  description: 'List attachments from a Knowledge Planet topic and, by default, its comments',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
    { name: 'include-comments', type: 'boolean', help: 'Include attachments from comments. Defaults to true.' },
    { name: 'include-sticky', type: 'boolean', help: 'Include sticky comments when reading comment attachments. Defaults to true.' },
    { name: 'count', type: 'int', default: 30, help: 'Page size for each paginated comment request' },
    { name: 'max-pages', type: 'int', default: 20, help: 'Maximum number of paginated requests to make when reading comment attachments' },
  ],
  columns: ['source_type', 'topic_id', 'comment_id', 'owner_name', 'create_time', 'file_id', 'file_name', 'file_hash', 'file_size', 'download_count', 'download_url', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'topic-files');

    const target = await resolveTopicReference(kwargs.target);
    const details = await readTopicDetails(page, target.topicId);
    const topic = details.topic ?? {};
    const groupId = target.groupId || String(details.group?.group_id ?? topic.group?.group_id ?? '');
    const topicId = getTopicId(topic, target.topicId);
    const downloadUrlMap = new Map();

    const collectFileUrls = async (files) => {
      for (const file of files) {
        if (file?.file_id && !downloadUrlMap.has(String(file.file_id))) {
          downloadUrlMap.set(String(file.file_id), await readFileDownloadUrl(page, String(file.file_id)));
        }
      }
    };

    const topicFiles = getTopicFiles(topic);
    await collectFileUrls(topicFiles);
    const rows = normalizeFileRows(topicFiles, {
      topicId,
      groupId,
      sourceType: 'topic',
      ownerName: getTopicOwner(topic)?.name ?? '',
      createTime: topic?.create_time ?? '',
      downloadUrlMap,
    });

    if (kwargs['include-comments'] !== false) {
      const result = await readAllTopicComments(page, target.topicId, {
        count: normalizeCommentPageSize(kwargs.count),
        maxPages: kwargs['max-pages'],
        includeSticky: kwargs['include-sticky'] !== false,
      });

      const comments = [];
      if (kwargs['include-sticky'] !== false) {
        comments.push(...result.stickyComments);
      }
      comments.push(...result.comments);

      for (const comment of comments) {
        const files = getCommentFiles(comment);
        await collectFileUrls(files);
        rows.push(...normalizeFileRows(files, {
          topicId,
          groupId,
          sourceType: 'comment',
          commentId: String(comment?.comment_id ?? ''),
          ownerName: comment?.owner?.name ?? '',
          createTime: comment?.create_time ?? '',
          downloadUrlMap,
        }));
      }
    }

    return rows;
  },
});

