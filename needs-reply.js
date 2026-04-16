import { cli, Strategy } from './opencli-compat.js';

import {
  buildTopicUrl,
  ensureZsxqSession,
  getTopicOwner,
  readGroupTopics,
  requireBrowserSession,
  resolveGroupReference,
  topicNeedsReply,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'needs-reply',
  description: 'List recent topics that likely need a maintainer reply based on explicit heuristics',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'group', help: 'Group id. Defaults to target_group, then 48844125114258, then first managed group.' },
    { name: 'count', type: 'int', default: 20, help: 'Number of recent topics to inspect' },
    { name: 'include-self-topics', type: 'boolean', help: 'Include topics created by the current logged-in account' },
  ],
  columns: ['topic_id', 'group_id', 'owner_name', 'title', 'comments_count', 'last_comment_owner', 'reason', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'needs-reply');

    const self = await ensureZsxqSession(page);
    const { groupId } = await resolveGroupReference(page, kwargs.group);
    const topics = await readGroupTopics(page, groupId, {
      scope: 'all',
      count: kwargs.count,
    });

    const rows = [];
    for (const topic of topics) {
      const decision = topicNeedsReply(topic, self?.user_id, {
        includeSelfTopics: !!kwargs['include-self-topics'],
      });
      if (!decision.needsReply) {
        continue;
      }

      rows.push({
        topic_id: topic?.topic_uid || topic?.topic_id || '',
        group_id: String(topic?.group?.group_id ?? groupId),
        owner_name: getTopicOwner(topic)?.name ?? '',
        title: topic?.title ?? '',
        comments_count: topic?.comments_count ?? 0,
        last_comment_owner: decision.latestComment?.owner?.name ?? '',
        reason: decision.reason,
        topic_url: buildTopicUrl(topic?.topic_uid || topic?.topic_id || '', String(topic?.group?.group_id ?? groupId)),
      });
    }

    return rows;
  },
});
