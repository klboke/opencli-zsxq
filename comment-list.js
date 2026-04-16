import { cli, Strategy } from './opencli-compat.js';

import {
  normalizeCommentPageSize,
  normalizeCommentRow,
  readTopicComments,
  readTopicDetails,
  requireBrowserSession,
  resolveTopicReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'comment-list',
  description: 'List comments for a Knowledge Planet topic',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
    { name: 'count', type: 'int', default: 30, help: 'Number of comments to fetch' },
    { name: 'begin-time', help: 'Optional begin_time cursor for pagination' },
    { name: 'include-sticky', type: 'boolean', help: 'Include sticky comments at the top of the result' },
  ],
  columns: ['comment_id', 'topic_id', 'owner_name', 'text', 'image_count', 'image_urls', 'likes_count', 'sticky', 'create_time', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'comment-list');

    const target = await resolveTopicReference(kwargs.target);
    const details = await readTopicDetails(page, target.topicId);
    const groupId = target.groupId || String(details.group?.group_id ?? details.topic?.group?.group_id ?? '');
    const result = await readTopicComments(page, target.topicId, {
      count: normalizeCommentPageSize(kwargs.count),
      beginTime: kwargs['begin-time'],
    });

    const rows = [];
    if (kwargs['include-sticky']) {
      rows.push(...result.stickyComments.map((comment) => normalizeCommentRow(comment, target.topicId, groupId)));
    }
    rows.push(...result.comments.map((comment) => normalizeCommentRow(comment, target.topicId, groupId)));
    return rows;
  },
});
