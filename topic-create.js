import { cli, Strategy } from './opencli-compat.js';

import {
  buildTopicUrl,
  createGroupTopic,
  normalizeTextPayload,
  requireBrowserSession,
  requireExecute,
  resolveGroupReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'topic-create',
  description: 'Create a talk topic in the current or specified Knowledge Planet group',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'group', help: 'Group id. Defaults to the current target_group in browser localStorage.' },
    { name: 'text', help: 'Topic text content' },
    { name: 'file', help: 'Read topic text from a UTF-8 file' },
    { name: 'execute', type: 'boolean', help: 'Actually create the topic' },
  ],
  columns: ['status', 'topic_id', 'group_id', 'title', 'text', 'create_time', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'topic-create');
    requireExecute(kwargs, 'create a Knowledge Planet topic');

    const { groupId } = await resolveGroupReference(page, kwargs.group);
    const text = normalizeTextPayload(kwargs, 'text', 'file');
    const topic = await createGroupTopic(page, groupId, text, { type: 'talk' });
    const topicId = topic.topic_uid || topic.topic_id || '';

    return [{
      status: 'created',
      topic_id: topicId,
      group_id: groupId,
      title: topic.title ?? '',
      text: topic.talk?.text ?? text,
      create_time: topic.create_time ?? '',
      topic_url: buildTopicUrl(topicId, groupId),
    }];
  },
});
