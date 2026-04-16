import { cli, Strategy } from './opencli-compat.js';

import {
  readAllTopicComments,
  buildTopicUrl,
  ensureZsxqSession,
  getTopicId,
  getTopicOwner,
  readGroupDetails,
  readTopicDetails,
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
  columns: ['topic_id', 'group_id', 'owner_name', 'title', 'create_time', 'comments_count', 'last_comment_owner', 'reason', 'topic_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'needs-reply');

    const self = await ensureZsxqSession(page);
    const { groupId } = await resolveGroupReference(page, kwargs.group);
    const group = await readGroupDetails(page, groupId);
    const staffUserIds = [
      group?.owner?.user_id,
      ...(Array.isArray(group?.admin_ids) ? group.admin_ids : []),
      ...(Array.isArray(group?.partner_ids) ? group.partner_ids : []),
    ]
      .map((item) => String(item ?? ''))
      .filter(Boolean);
    const topics = await readGroupTopics(page, groupId, {
      scope: 'all',
      count: kwargs.count,
    });

    const rows = [];
    for (const topic of topics) {
      let topicForDecision = topic;
      let latestCommentOverride = null;
      const previewComments = Array.isArray(topicForDecision?.show_comments) ? topicForDecision.show_comments : [];
      const commentsCount = Number(topicForDecision?.comments_count ?? 0);

      // Some list/detail responses expose only a truncated preview list.
      // When preview count is lower than comments_count, re-read comments to get the true latest reply.
      if (commentsCount > 0 && previewComments.length > 0 && previewComments.length < commentsCount) {
        const allComments = await readAllTopicComments(page, getTopicId(topicForDecision), {
          count: 30,
          maxPages: Math.max(1, Math.ceil(commentsCount / 30)),
          includeSticky: false,
        });
        latestCommentOverride = allComments.comments[allComments.comments.length - 1] ?? null;
      }

      let decision = topicNeedsReply(topicForDecision, self?.user_id, {
        includeSelfTopics: !!kwargs['include-self-topics'],
        latestCommentOverride,
        staffUserIds,
      });

      // Some list responses omit preview comments even when comments_count > 0.
      // Re-read the topic details once to recover show_comments before deciding.
      if (decision.reason === 'comments_exist_but_preview_missing' && Number(topic?.comments_count ?? 0) > 0) {
        const details = await readTopicDetails(page, getTopicId(topic));
        topicForDecision = details.topic ?? topicForDecision;
        decision = topicNeedsReply(topicForDecision, self?.user_id, {
          includeSelfTopics: !!kwargs['include-self-topics'],
          latestCommentOverride,
          staffUserIds,
        });
      }

      if (!decision.needsReply) {
        continue;
      }

      const topicId = getTopicId(topicForDecision);
      rows.push({
        topic_id: topicId,
        group_id: String(topicForDecision?.group?.group_id ?? groupId),
        owner_name: getTopicOwner(topicForDecision)?.name ?? '',
        title: topicForDecision?.title ?? '',
        create_time: topicForDecision?.create_time ?? '',
        comments_count: topicForDecision?.comments_count ?? 0,
        last_comment_owner: decision.latestComment?.owner?.name ?? '',
        reason: decision.reason,
        topic_url: buildTopicUrl(
          topicId,
          String(topicForDecision?.group?.group_id ?? groupId),
        ),
      });
    }

    return rows;
  },
});
