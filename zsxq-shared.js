import fs from 'node:fs';

import { CommandExecutionError } from '@jackwener/opencli/errors';

export const ZSXQ_DOMAIN = 'wx.zsxq.com';
export const ZSXQ_WEB_ORIGIN = 'https://wx.zsxq.com';
export const ZSXQ_API_ORIGIN = 'https://api.zsxq.com';
export const ZSXQ_API_BASE = `${ZSXQ_API_ORIGIN}/v2`;
export const ZSXQ_API_VERSION = '2.90.0';

function normalizeMultilineText(value) {
  return String(value).replace(/\r\n/g, '\n');
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
  const text = kwargs.text != null ? normalizeMultilineText(kwargs.text) : '';
  const file = kwargs.file != null ? String(kwargs.file) : '';

  if (text && file) {
    throw new CommandExecutionError('Use either --text or --file, not both.');
  }

  let payload = text;
  if (file) {
    payload = normalizeMultilineText(fs.readFileSync(file, 'utf8'));
  }

  if (!payload.trim()) {
    throw new CommandExecutionError('Reply content is empty. Provide --text or --file with non-empty content.');
  }

  return payload;
}

export function buildTopicUrl(topicId, groupId) {
  if (!topicId) return '';
  if (groupId) {
    return `${ZSXQ_WEB_ORIGIN}/group/${groupId}/topic/${topicId}`;
  }
  return `${ZSXQ_WEB_ORIGIN}/mweb/views/topicdetail/topicdetail.html?topic_id=${topicId}`;
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

      const input = { url, method, body };
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
  `;

  if (typeof page.evaluateWithArgs === 'function') {
    const result = await page.evaluateWithArgs(script, {
      url: options.url,
      method: options.method ?? 'GET',
      body: options.body ?? null,
    });
    if (result?.error) {
      throw new CommandExecutionError(`Knowledge Planet request failed: ${result.error}`);
    }
    return result;
  }

  const fallbackScript = `
    (() => {
      const url = ${JSON.stringify(options.url)};
      const method = ${JSON.stringify(options.method ?? 'GET')};
      const body = ${JSON.stringify(options.body ?? null)};
      return ${script};
    })()
  `;
  const result = await page.evaluate(fallbackScript);
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
