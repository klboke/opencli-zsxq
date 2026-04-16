import { cli, Strategy } from './opencli-compat.js';

import {
  getCommentImages,
  getTopicId,
  getTopicImages,
  getTopicOwner,
  normalizeCommentPageSize,
  normalizeImageRows,
  readAllTopicComments,
  readTopicDetails,
  requireBrowserSession,
  resolveTopicReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'topic-images',
  description: 'List image assets from a Knowledge Planet topic and, by default, its comments',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
    { name: 'include-comments', type: 'boolean', help: 'Include images from comments. Defaults to true.' },
    { name: 'include-sticky', type: 'boolean', help: 'Include sticky comments when reading comment images. Defaults to true.' },
    { name: 'count', type: 'int', default: 30, help: 'Page size for each paginated comment request' },
    { name: 'max-pages', type: 'int', default: 20, help: 'Maximum number of paginated requests to make when reading comment images' },
  ],
  columns: ['source_type', 'topic_id', 'comment_id', 'owner_name', 'create_time', 'image_id', 'image_type', 'thumbnail_url', 'large_url', 'original_url', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'topic-images');

    const target = await resolveTopicReference(kwargs.target);
    const details = await readTopicDetails(page, target.topicId);
    const topic = details.topic ?? {};
    const groupId = target.groupId || String(details.group?.group_id ?? topic.group?.group_id ?? '');
    const topicId = getTopicId(topic, target.topicId);

    const rows = normalizeImageRows(getTopicImages(topic), {
      topicId,
      groupId,
      sourceType: 'topic',
      ownerName: getTopicOwner(topic)?.name ?? '',
      createTime: topic?.create_time ?? '',
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
        rows.push(...normalizeImageRows(getCommentImages(comment), {
          topicId,
          groupId,
          sourceType: 'comment',
          commentId: String(comment?.comment_id ?? ''),
          ownerName: comment?.owner?.name ?? '',
          createTime: comment?.create_time ?? '',
        }));
      }
    }

    return rows;
  },
});
