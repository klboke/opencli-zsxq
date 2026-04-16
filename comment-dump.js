import { cli, Strategy } from './opencli-compat.js';

import {
  normalizeCommentPageSize,
  normalizeCommentRow,
  readAllTopicComments,
  readTopicDetails,
  requireBrowserSession,
  resolveTopicReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'comment-dump',
  description: 'Dump as many comments as possible for a Knowledge Planet topic using paginated reads',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
    { name: 'count', type: 'int', default: 30, help: 'Page size for each paginated comment request' },
    { name: 'max-pages', type: 'int', default: 20, help: 'Maximum number of paginated requests to make' },
    { name: 'begin-time', help: 'Optional begin_time cursor to start from' },
    { name: 'include-sticky', type: 'boolean', help: 'Include sticky comments in the output' },
  ],
  columns: ['comment_id', 'topic_id', 'owner_name', 'text', 'image_count', 'image_urls', 'likes_count', 'sticky', 'create_time', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'comment-dump');

    const target = await resolveTopicReference(kwargs.target);
    const details = await readTopicDetails(page, target.topicId);
    const groupId = target.groupId || String(details.group?.group_id ?? details.topic?.group?.group_id ?? '');
    const result = await readAllTopicComments(page, target.topicId, {
      count: normalizeCommentPageSize(kwargs.count),
      maxPages: kwargs['max-pages'],
      beginTime: kwargs['begin-time'],
      includeSticky: kwargs['include-sticky'] !== false,
    });

    const rows = [];
    if (kwargs['include-sticky'] !== false) {
      rows.push(...result.stickyComments.map((comment) => normalizeCommentRow(comment, target.topicId, groupId)));
    }
    rows.push(...result.comments.map((comment) => normalizeCommentRow(comment, target.topicId, groupId)));
    return rows;
  },
});
