import { cli, Strategy } from './opencli-compat.js';

import {
  buildTopicUrl,
  deleteTopicById,
  readTopicDetails,
  requireBrowserSession,
  requireExecute,
  resolveTopicReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'topic-delete',
  description: 'Delete a Knowledge Planet topic',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
    { name: 'execute', type: 'boolean', help: 'Actually delete the topic' },
  ],
  columns: ['status', 'topic_id', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'topic-delete');
    requireExecute(kwargs, 'delete a Knowledge Planet topic');

    const target = await resolveTopicReference(kwargs.target);
    const details = await readTopicDetails(page, target.topicId);
    const groupId = target.groupId || String(details.group?.group_id ?? details.topic?.group?.group_id ?? '');
    await deleteTopicById(page, target.topicId);

    return [{
      status: 'deleted',
      topic_id: target.topicId,
      topic_url: buildTopicUrl(target.topicId, groupId),
    }];
  },
});
