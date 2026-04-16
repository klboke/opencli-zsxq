import { cli, Strategy } from './opencli-compat.js';

import {
  deleteCommentById,
  requireBrowserSession,
  requireExecute,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'comment-delete',
  description: 'Delete a Knowledge Planet comment by comment id',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'comment-id', positional: true, required: true, help: 'Comment id to delete' },
    { name: 'reason', help: 'Optional moderation reason passed to the API' },
    { name: 'description', help: 'Optional description when reason=custom' },
    { name: 'execute', type: 'boolean', help: 'Actually delete the comment' },
  ],
  columns: ['status', 'comment_id', 'reason'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'comment-delete');
    requireExecute(kwargs, 'delete a Knowledge Planet comment');

    const commentId = String(kwargs['comment-id']).trim();
    if (!/^\d+$/.test(commentId)) {
      throw new Error(`Invalid comment id: ${commentId}`);
    }

    await deleteCommentById(page, commentId, {
      reason: kwargs.reason,
      description: kwargs.description,
    });

    return [{
      status: 'deleted',
      comment_id: commentId,
      reason: kwargs.reason ?? '',
    }];
  },
});
