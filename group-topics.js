import { cli, Strategy } from './opencli-compat.js';

import {
  normalizeTopicRow,
  readGroupTopics,
  requireBrowserSession,
  resolveGroupReference,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'group-topics',
  description: 'List topics from the current or specified Knowledge Planet group',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'group', help: 'Group id. Defaults to the current target_group in browser localStorage.' },
    { name: 'scope', default: 'all', choices: ['all', 'digests'], help: 'Topic scope to list' },
    { name: 'count', type: 'int', default: 20, help: 'Number of topics to fetch' },
    { name: 'begin-time', help: 'Optional begin_time cursor from a previous response' },
    { name: 'end-time', help: 'Optional end_time cursor' },
  ],
  columns: ['topic_id', 'group_id', 'group_name', 'owner_name', 'title', 'text', 'comments_count', 'sticky', 'digested', 'create_time', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'group-topics');

    const { groupId } = await resolveGroupReference(page, kwargs.group);
    const topics = await readGroupTopics(page, groupId, {
      scope: kwargs.scope,
      count: kwargs.count,
      beginTime: kwargs['begin-time'],
      endTime: kwargs['end-time'],
    });

    return topics.map((topic) => normalizeTopicRow(topic));
  },
});
