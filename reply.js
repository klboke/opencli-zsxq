import { cli, Strategy } from '@jackwener/opencli/registry';

import {
  buildTopicUrl,
  createTopicReply,
  readTopicDetails,
  renderApiFailure,
  requireBrowserSession,
  requireExecute,
  resolveReplyPayload,
  resolveTopicReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'reply',
  description: 'Reply to a Knowledge Planet topic using the logged-in browser session',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
    { name: 'text', help: 'Reply text content' },
    { name: 'file', help: 'Read reply text from a UTF-8 file' },
    { name: 'execute', type: 'boolean', help: 'Actually send the reply' },
  ],
  columns: ['status', 'comment_id', 'topic_id', 'group_id', 'owner_name', 'create_time', 'topic_url', 'text'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'reply');
    requireExecute(kwargs, 'reply to a Knowledge Planet topic');

    const payload = resolveReplyPayload(kwargs);
    const target = await resolveTopicReference(kwargs.target);
    const comment = await createTopicReply(page, target.topicId, payload);
    if (!comment.comment_id) {
      throw new Error(renderApiFailure(`reply to topic ${target.topicId}`, { payload: { succeeded: false }, status: 200 }));
    }

    const details = await readTopicDetails(page, target.topicId);
    const group = details.group ?? {};
    const resolvedGroupId = target.groupId || group.group_id || details.topic?.group?.group_id || '';
    const owner = comment.owner ?? {};

    return [{
      status: 'posted',
      comment_id: comment.comment_id ?? '',
      topic_id: target.topicId,
      group_id: resolvedGroupId,
      owner_name: owner.name ?? '',
      create_time: comment.create_time ?? '',
      topic_url: buildTopicUrl(target.topicId, resolvedGroupId),
      text: comment.text ?? payload,
    }];
  },
});
