import fs from 'node:fs';

import { CommandExecutionError } from './opencli-compat.js';

export const ZSXQ_DOMAIN = 'wx.zsxq.com';
export const ZSXQ_WEB_ORIGIN = 'https://wx.zsxq.com';
export const ZSXQ_API_ORIGIN = 'https://api.zsxq.com';
export const ZSXQ_API_BASE = `${ZSXQ_API_ORIGIN}/v2`;
export const ZSXQ_API_VERSION = '2.90.0';
export const ZSXQ_DEFAULT_GROUP_ID = '48844125114258';
export const ZSXQ_MAX_COMMENT_PAGE_SIZE = 30;

function normalizeMultilineText(value) {
  return String(value).replace(/\r\n/g, '\n');
}

export function normalizeCommentPageSize(value) {
  const parsed = Number(value ?? ZSXQ_MAX_COMMENT_PAGE_SIZE);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return ZSXQ_MAX_COMMENT_PAGE_SIZE;
  }
  return Math.min(Math.floor(parsed), ZSXQ_MAX_COMMENT_PAGE_SIZE);
}

export function normalizeTextPayload(kwargs, textKey = 'text', fileKey = 'file') {
  const text = kwargs[textKey] != null ? normalizeMultilineText(kwargs[textKey]) : '';
  const file = kwargs[fileKey] != null ? String(kwargs[fileKey]) : '';

  if (text && file) {
    throw new CommandExecutionError(`Use either --${textKey} or --${fileKey}, not both.`);
  }

  let payload = text;
  if (file) {
    payload = normalizeMultilineText(fs.readFileSync(file, 'utf8'));
  }

  if (!payload.trim()) {
    throw new CommandExecutionError(`Content is empty. Provide --${textKey} or --${fileKey} with non-empty content.`);
  }

  return payload;
}

export function requireBrowserSession(page, action) {
  if (!page) {
    throw new CommandExecutionError(`Browser session required for zsxq ${action}`);
  }
}

export function requireExecute(kwargs, action) {
  if (!kwargs.execute) {
    throw new CommandExecutionError(
      `Refusing to ${action} without --execute. Re-run with --execute after reviewing the payload.`,
    );
  }
}

export function resolveReplyPayload(kwargs) {
  return normalizeTextPayload(kwargs, 'text', 'file');
}

export function buildTopicUrl(topicId, groupId) {
  if (!topicId) return '';
  if (groupId) {
    return `${ZSXQ_WEB_ORIGIN}/group/${groupId}/topic/${topicId}`;
  }
  return `${ZSXQ_WEB_ORIGIN}/mweb/views/topicdetail/topicdetail.html?topic_id=${topicId}`;
}

export function buildGroupUrl(groupId) {
  return groupId ? `${ZSXQ_WEB_ORIGIN}/group/${groupId}` : ZSXQ_WEB_ORIGIN;
}

export async function ensureZsxqPage(page, preferredUrl = ZSXQ_WEB_ORIGIN) {
  requireBrowserSession(page, 'zsxq page');
  try {
    const currentUrl = typeof page.getCurrentUrl === 'function' ? await page.getCurrentUrl() : '';
    return currentUrl || preferredUrl;
  } catch {
    return preferredUrl;
  }
}

export async function resolveTopicReference(input) {
  const raw = String(input).trim();
  if (!raw) {
    throw new CommandExecutionError('Missing topic id or URL.');
  }

  if (/^\d+$/.test(raw)) {
    return { topicId: raw, groupId: '', originalInput: raw, resolvedUrl: '' };
  }

  const direct = parseTopicFromUrlLike(raw);
  if (direct) {
    return { ...direct, originalInput: raw };
  }

  const resolvedUrl = await resolveRedirectUrl(raw);
  const redirected = parseTopicFromUrlLike(resolvedUrl);
  if (redirected) {
    return { ...redirected, originalInput: raw, resolvedUrl };
  }

  throw new CommandExecutionError(`Could not resolve a Knowledge Planet topic id from: ${raw}`);
}

export async function getCurrentTargetGroup(page) {
  requireBrowserSession(page, 'group context');
  await ensureZsxqPage(page);
  const script = `
    (() => {
      try {
        const raw = localStorage.getItem('target_group');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })()
  `;
  const group = await page.evaluate(script);
  return group ?? null;
}

export async function readManagedGroups(page) {
  await ensureZsxqPage(page);
  const response = await zsxqApiRequest(page, {
    url: `${ZSXQ_API_BASE}/users/self/groups/managed_groups`,
    method: 'GET',
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure('load managed groups', response));
  }

  return response.payload.resp_data?.groups ?? [];
}

export async function resolveGroupReference(page, input) {
  const raw = input != null ? String(input).trim() : '';
  if (raw) {
    if (!/^\d+$/.test(raw)) {
      throw new CommandExecutionError(`Invalid group id: ${raw}`);
    }
    return { groupId: raw, group: null };
  }

  const group = await getCurrentTargetGroup(page);
  const groupId = group?.group_id ? String(group.group_id) : '';
  if (groupId) {
    return { groupId, group };
  }

  const managedGroups = await readManagedGroups(page);
  const defaultGroup = managedGroups.find((item) => String(item.group_id) === ZSXQ_DEFAULT_GROUP_ID) ?? null;
  if (defaultGroup?.group_id) {
    return {
      groupId: String(defaultGroup.group_id),
      group: defaultGroup,
    };
  }

  const fallbackGroup = managedGroups[0] ?? null;
  if (!fallbackGroup?.group_id) {
    throw new CommandExecutionError(`No active target group found. Pass --group <group_id> or use the default group ${ZSXQ_DEFAULT_GROUP_ID}.`);
  }

  return {
    groupId: String(fallbackGroup.group_id),
    group: fallbackGroup,
  };
}

function parseTopicFromUrlLike(value) {
  try {
    const url = new URL(value);
    const topicId = url.searchParams.get('topic_id')
      || url.pathname.match(/\/topic\/(\d+)/)?.[1]
      || '';
    if (!topicId) {
      return null;
    }

    const groupId = url.searchParams.get('group_id')
      || url.pathname.match(/\/group\/(\d+)\/topic\/\d+/)?.[1]
      || '';

    return {
      topicId,
      groupId,
      resolvedUrl: url.toString(),
    };
  } catch {
    return null;
  }
}

async function resolveRedirectUrl(value) {
  try {
    const response = await fetch(value, {
      method: 'GET',
      redirect: 'follow',
    });
    return response.url || value;
  } catch {
    return value;
  }
}

export async function ensureZsxqSession(page) {
  const response = await zsxqApiRequest(page, {
    url: `${ZSXQ_API_BASE}/users/self`,
    method: 'GET',
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure('load current user', response));
  }

  return response.payload.resp_data?.user ?? null;
}

export async function readTopicDetails(page, topicId) {
  const response = await zsxqApiRequest(page, {
    url: `${ZSXQ_API_BASE}/topics/${topicId}/details`,
    method: 'GET',
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`read topic ${topicId}`, response));
  }

  const data = response.payload.resp_data ?? {};
  const topic = data.topic ?? {};
  return {
    topic,
    group: data.group ?? topic.group ?? {},
    raw: response.payload,
  };
}

export async function createTopicReply(page, topicId, text) {
  const response = await zsxqApiRequest(page, {
    url: `${ZSXQ_API_BASE}/topics/${topicId}/comments`,
    method: 'POST',
    body: {
      req_data: {
        text,
        image_ids: [],
        mentioned_user_ids: [],
      },
    },
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`reply to topic ${topicId}`, response));
  }

  return response.payload.resp_data?.comment ?? {};
}

export async function readGroupTopics(page, groupId, options = {}) {
  const url = new URL(`${ZSXQ_API_BASE}/groups/${groupId}/topics`);
  url.searchParams.set('scope', options.scope ?? 'all');
  url.searchParams.set('count', String(options.count ?? 20));
  if (options.beginTime) {
    url.searchParams.set('begin_time', String(options.beginTime));
  }
  if (options.endTime) {
    url.searchParams.set('end_time', String(options.endTime));
  }

  const response = await zsxqApiRequest(page, {
    url: url.toString(),
    method: 'GET',
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`read topics for group ${groupId}`, response));
  }

  return response.payload.resp_data?.topics ?? [];
}

export async function readTopicComments(page, topicId, options = {}) {
  const url = new URL(`${ZSXQ_API_BASE}/topics/${topicId}/comments`);
  const count = normalizeCommentPageSize(options.count);
  url.searchParams.set('sort', 'asc');
  url.searchParams.set('count', String(count));
  url.searchParams.set('with_sticky', 'true');
  if (options.beginTime) {
    url.searchParams.set('begin_time', String(options.beginTime));
  }

  const response = await zsxqApiRequest(page, {
    url: url.toString(),
    method: 'GET',
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`read comments for topic ${topicId}`, response));
  }

  const data = response.payload.resp_data ?? {};
  return {
    comments: data.comments ?? [],
    stickyComments: data.sticky_comments ?? [],
    index: data.index ?? '',
  };
}

export async function readAllTopicComments(page, topicId, options = {}) {
  const pageSize = normalizeCommentPageSize(options.count);
  const maxPages = Number(options.maxPages ?? 20);
  const includeSticky = options.includeSticky !== false;

  let beginTime = options.beginTime ? String(options.beginTime) : '';
  let pageCount = 0;
  let lastCursor = '';
  const stickyComments = [];
  const comments = [];
  const seenCommentIds = new Set();

  while (pageCount < maxPages) {
    const result = await readTopicComments(page, topicId, {
      count: pageSize,
      beginTime,
    });

    if (includeSticky && stickyComments.length === 0) {
      for (const comment of result.stickyComments) {
        const commentId = String(comment?.comment_id ?? '');
        if (!commentId || seenCommentIds.has(commentId)) continue;
        seenCommentIds.add(commentId);
        stickyComments.push(comment);
      }
    }

    const batch = result.comments ?? [];
    if (batch.length === 0) {
      break;
    }

    let added = 0;
    for (const comment of batch) {
      const commentId = String(comment?.comment_id ?? '');
      if (!commentId || seenCommentIds.has(commentId)) continue;
      seenCommentIds.add(commentId);
      comments.push(comment);
      added += 1;
    }

    const nextCursor = batch[batch.length - 1]?.create_time ? String(batch[batch.length - 1].create_time) : '';
    if (!nextCursor || nextCursor === beginTime || nextCursor === lastCursor || added === 0) {
      break;
    }

    lastCursor = beginTime;
    beginTime = nextCursor;
    pageCount += 1;
  }

  return {
    stickyComments,
    comments,
  };
}

export async function createGroupTopic(page, groupId, text, options = {}) {
  const payload = {
    req_data: {
      type: options.type ?? 'talk',
      text,
      image_ids: options.imageIds ?? [],
      file_ids: options.fileIds ?? [],
      mentioned_user_ids: options.mentionedUserIds ?? [],
    },
  };

  const response = await zsxqApiRequest(page, {
    url: `${ZSXQ_API_BASE}/groups/${groupId}/topics`,
    method: 'POST',
    body: payload,
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`create topic in group ${groupId}`, response));
  }

  return response.payload.resp_data?.topic ?? {};
}

export async function setTopicField(page, topicId, field, value) {
  const response = await zsxqApiRequest(page, {
    url: `${ZSXQ_API_BASE}/topics/${topicId}`,
    method: 'PUT',
    body: {
      req_data: {
        [field]: value,
      },
    },
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`update topic ${topicId}`, response));
  }

  return response.payload.resp_data?.topic ?? response.payload.resp_data ?? {};
}

export async function deleteTopicById(page, topicId) {
  const response = await zsxqApiRequest(page, {
    url: `${ZSXQ_API_BASE}/topics/${topicId}`,
    method: 'DELETE',
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`delete topic ${topicId}`, response));
  }

  return response.payload.resp_data ?? {};
}

export async function deleteCommentById(page, commentId, options = {}) {
  const url = new URL(`${ZSXQ_API_BASE}/comments/${commentId}`);
  if (options.reason) {
    url.searchParams.set('reason', String(options.reason));
  }
  if (options.reason === 'custom' && options.description) {
    url.searchParams.set('description', String(options.description));
  }

  const response = await zsxqApiRequest(page, {
    url: url.toString(),
    method: 'DELETE',
  });

  if (response.status === 401) {
    throw new CommandExecutionError('Knowledge Planet session is not authenticated in Chrome.');
  }

  if (!response.payload?.succeeded) {
    throw new CommandExecutionError(renderApiFailure(`delete comment ${commentId}`, response));
  }

  return response.payload.resp_data ?? {};
}

export function normalizeTopicRow(topic) {
  const owner = getTopicOwner(topic) ?? {};
  const group = topic?.group ?? {};
  const topicId = getTopicId(topic);
  const groupId = group?.group_id ? String(group.group_id) : '';

  return {
    topic_id: topicId,
    group_id: groupId,
    group_name: group?.name ?? '',
    owner_name: owner?.name ?? '',
    title: topic?.title ?? '',
    text: getTopicText(topic),
    comments_count: topic?.comments_count ?? 0,
    sticky: !!topic?.sticky,
    digested: !!topic?.digested,
    create_time: topic?.create_time ?? '',
    topic_url: buildTopicUrl(topicId, groupId),
  };
}

export function normalizeCommentRow(comment, topicId = '', groupId = '') {
  const owner = comment?.owner ?? {};
  return {
    comment_id: comment?.comment_id ?? '',
    topic_id: topicId,
    owner_name: owner?.name ?? '',
    text: comment?.text ?? '',
    likes_count: comment?.likes_count ?? 0,
    sticky: !!comment?.sticky,
    create_time: comment?.create_time ?? '',
    topic_url: topicId ? buildTopicUrl(topicId, groupId) : '',
  };
}

export function topicNeedsReply(topic, selfUserId, options = {}) {
  const currentUserId = String(selfUserId ?? '');
  const skipSelfTopics = options.includeSelfTopics ? false : true;
  const owner = getTopicOwner(topic) ?? {};
  const ownerUserId = String(owner?.user_id ?? '');
  const commentsCount = Number(topic?.comments_count ?? 0);

  if (skipSelfTopics && currentUserId && ownerUserId === currentUserId) {
    return { needsReply: false, reason: 'self_topic' };
  }

  if (commentsCount === 0) {
    return {
      needsReply: true,
      reason: 'no_comments',
      latestComment: null,
    };
  }

  const latestComment = Array.isArray(topic?.show_comments) && topic.show_comments.length > 0
    ? topic.show_comments[0]
    : null;

  if (!latestComment) {
    return {
      needsReply: true,
      reason: 'comments_exist_but_preview_missing',
      latestComment: null,
    };
  }

  const latestCommentOwnerId = String(latestComment?.owner?.user_id ?? '');
  if (!currentUserId || latestCommentOwnerId !== currentUserId) {
    return {
      needsReply: true,
      reason: 'latest_comment_not_mine',
      latestComment,
    };
  }

  return {
    needsReply: false,
    reason: 'latest_comment_is_mine',
    latestComment,
  };
}

export function getTopicOwner(topic) {
  if (!topic || typeof topic !== 'object') {
    return null;
  }

  const typedCandidates = getPrimaryTopicEntities(topic).map((item) => item?.owner);
  for (const candidate of typedCandidates) {
    if (candidate?.user_id || candidate?.name) {
      return candidate;
    }
  }

  for (const value of Object.values(topic)) {
    if (value && typeof value === 'object' && value.owner && (value.owner.user_id || value.owner.name)) {
      return value.owner;
    }
  }

  return null;
}

export function getTopicText(topic) {
  if (!topic || typeof topic !== 'object') {
    return '';
  }

  const typedCandidates = getPrimaryTopicEntities(topic).map((item) => item?.text);

  for (const candidate of typedCandidates) {
    if (typeof candidate === 'string' && candidate) {
      return candidate;
    }
  }

  return '';
}

export function getTopicId(topic, fallback = '') {
  const topicUid = topic?.topic_uid;
  if (topicUid !== undefined && topicUid !== null && String(topicUid)) {
    return String(topicUid);
  }

  const topicId = topic?.topic_id;
  if (typeof topicId === 'string' && topicId) {
    return topicId;
  }

  if (fallback !== undefined && fallback !== null && String(fallback)) {
    return String(fallback);
  }

  if (topicId !== undefined && topicId !== null && String(topicId)) {
    return String(topicId);
  }

  return '';
}

function getPrimaryTopicEntities(topic) {
  const orderedKeys = getTopicEntityKeys(topic);
  return orderedKeys
    .map((key) => topic?.[key])
    .filter((value) => value && typeof value === 'object');
}

function getTopicEntityKeys(topic) {
  const rawType = String(topic?.type ?? '').trim().toLowerCase();
  const aliases = {
    talk: ['talk'],
    answer: ['answer'],
    article: ['article'],
    solution: ['solution'],
    task: ['task'],
    checkin: ['checkin'],
    question: ['question'],
    'q&a': ['answer', 'question'],
    qa: ['answer', 'question'],
  };

  const preferred = aliases[rawType] ?? [];
  const defaults = ['talk', 'answer', 'article', 'solution', 'task', 'checkin', 'question'];
  return [...new Set([...preferred, ...defaults])];
}

export async function zsxqApiRequest(page, options) {
  requireBrowserSession(page, 'request');
  const script = `
    (async () => {
      const fallbackUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const rand = Math.random() * 16 | 0;
        const value = char === 'x' ? rand : ((rand & 0x3) | 0x8);
        return value.toString(16);
      });
      const sha1Hex = async (value) => {
        const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
        return Array.from(new Uint8Array(digest))
          .map((item) => item.toString(16).padStart(2, '0'))
          .join('');
      };

      const input = { url: __zsxq_url, method: __zsxq_method, body: __zsxq_body };
      const urlValue = input.url;
      const methodValue = input.method || 'GET';
      const bodyValue = input.body ?? null;
      const timestamp = Date.now().toString();
      const requestId = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
      const signature = await sha1Hex(urlValue + ' ' + timestamp + ' ' + requestId);
      const headers = {
        'Accept': 'application/json, text/plain, */*',
        'X-Version': ${JSON.stringify(ZSXQ_API_VERSION)},
        'X-Timestamp': timestamp,
        'X-Request-Id': requestId,
        'X-Signature': signature,
        'X-Aduid': localStorage.getItem('XAduid') || '',
      };

      const request = {
        method: methodValue,
        credentials: 'include',
        headers,
      };
      if (bodyValue !== null && methodValue !== 'GET' && methodValue !== 'HEAD') {
        headers['Content-Type'] = 'application/json';
        request.body = JSON.stringify(bodyValue);
      }

      try {
        const response = await fetch(urlValue, request);
        const text = await response.text();
        let payload;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = { raw_text: text };
        }
        return {
          ok: response.ok,
          status: response.status,
          url: response.url,
          payload,
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          payload: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  `.trim();
  const fallbackScript = `
    (() => {
      const __zsxq_url = ${JSON.stringify(options.url)};
      const __zsxq_method = ${JSON.stringify(options.method ?? 'GET')};
      const __zsxq_body = ${JSON.stringify(options.body ?? null)};
      return (${script});
    })()
  `;
  const result = await page.evaluate(fallbackScript);
  if (!result || typeof result !== 'object') {
    throw new CommandExecutionError('Knowledge Planet request returned no response payload.');
  }
  if (result?.error) {
    throw new CommandExecutionError(`Knowledge Planet request failed: ${result.error}`);
  }
  return result;
}

export function renderApiFailure(action, response) {
  const payload = response?.payload ?? {};
  const code = payload.code != null ? ` code=${payload.code}` : '';
  const info = payload.info ? ` info=${payload.info}` : '';
  const error = payload.error ? ` error=${payload.error}` : '';
  const status = response?.status != null ? ` status=${response.status}` : '';
  return `Knowledge Planet API failed to ${action}.${status}${code}${info}${error}`;
}
