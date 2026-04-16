import { cli, Strategy } from './opencli-compat.js';

import {
  buildTopicUrl,
  createTopicReply,
  ensureZsxqSession,
  readAllTopicComments,
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
    const self = await ensureZsxqSession(page);
    const details = await readTopicDetails(page, target.topicId);
    const group = details.group ?? {};
    const resolvedGroupId = target.groupId || group.group_id || details.topic?.group?.group_id || '';
    const baselineCommentsCount = Number(details.topic?.comments_count ?? 0);

    let comment;
    let reconciled = false;
    try {
      comment = await createTopicReply(page, target.topicId, payload);
    } catch (error) {
      comment = await reconcilePostedReply(page, {
        topicId: target.topicId,
        baselineCommentsCount,
        selfUserId: self?.user_id,
        expectedText: payload,
      });
      if (!comment) {
        throw error;
      }
      reconciled = true;
    }

    if (!comment.comment_id) {
      throw new Error(renderApiFailure(`reply to topic ${target.topicId}`, { payload: { succeeded: false }, status: 200 }));
    }
    const owner = comment.owner ?? {};

    return [{
      status: reconciled ? 'posted_reconciled' : 'posted',
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

async function reconcilePostedReply(page, { topicId, baselineCommentsCount, selfUserId, expectedText }) {
  try {
    const details = await readTopicDetails(page, topicId);
    const currentCommentsCount = Number(details.topic?.comments_count ?? 0);
    if (currentCommentsCount <= baselineCommentsCount) {
      return null;
    }

    const result = await readAllTopicComments(page, topicId, {
      count: 30,
      maxPages: Math.max(1, Math.ceil(currentCommentsCount / 30)),
      includeSticky: false,
    });

    const comments = result.comments ?? [];
    const candidates = comments.slice(Math.max(0, baselineCommentsCount));
    const expected = normalizeComparableText(expectedText);
    const selfId = String(selfUserId ?? '');

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const comment = candidates[index];
      if (selfId && String(comment?.owner?.user_id ?? '') !== selfId) {
        continue;
      }
      if (normalizeComparableText(comment?.text ?? '') === expected) {
        return comment;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeComparableText(value) {
  return String(value).replace(/\r\n/g, '\n').trim();
}
