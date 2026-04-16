import { cli, Strategy } from './opencli-compat.js';

import {
  buildTopicUrl,
  getTopicId,
  getTopicOwner,
  getTopicText,
  readTopicDetails,
  requireBrowserSession,
  resolveTopicReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'topic',
  description: 'Read a Knowledge Planet topic by topic id or URL',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
  ],
  columns: ['topic_id', 'group_id', 'group_name', 'owner_name', 'title', 'text', 'comments_count', 'create_time', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'topic');

    const target = await resolveTopicReference(kwargs.target);
    const details = await readTopicDetails(page, target.topicId);
    const topic = details.topic ?? {};
    const group = details.group ?? {};
    const topicId = getTopicId(topic, target.topicId);
    const resolvedGroupId = target.groupId || group.group_id || topic.group?.group_id || '';

    return [{
      topic_id: topicId,
      group_id: resolvedGroupId,
      group_name: group.name ?? topic.group?.name ?? '',
      owner_name: getTopicOwner(topic)?.name ?? '',
      title: topic.title ?? '',
      text: getTopicText(topic),
      comments_count: topic.comments_count ?? 0,
      create_time: topic.create_time ?? '',
      topic_url: buildTopicUrl(topicId, resolvedGroupId),
    }];
  },
});
