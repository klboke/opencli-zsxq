import { cli, Strategy } from './opencli-compat.js';

import {
  buildTopicUrl,
  readTopicDetails,
  requireBrowserSession,
  requireExecute,
  resolveTopicReference,
  setTopicField,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'topic-sticky',
  description: 'Set or unset sticky on a Knowledge Planet topic',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'target', positional: true, required: true, help: 'Topic id, wx.zsxq.com URL, or t.zsxq.com short link' },
    { name: 'value', positional: true, required: true, choices: ['on', 'off'], help: 'Sticky state to apply' },
    { name: 'execute', type: 'boolean', help: 'Actually update the topic' },
  ],
  columns: ['status', 'topic_id', 'sticky', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'topic-sticky');
    requireExecute(kwargs, 'update topic sticky state');

    const target = await resolveTopicReference(kwargs.target);
    const value = kwargs.value === 'on';
    await setTopicField(page, target.topicId, 'sticky', value);
    const details = await readTopicDetails(page, target.topicId);
    const groupId = target.groupId || String(details.group?.group_id ?? details.topic?.group?.group_id ?? '');

    return [{
      status: 'updated',
      topic_id: target.topicId,
      sticky: value,
      topic_url: buildTopicUrl(target.topicId, groupId),
    }];
  },
});
