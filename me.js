import { cli, Strategy } from './opencli-compat.js';

import { ensureZsxqSession, requireBrowserSession, ZSXQ_DOMAIN } from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'me',
  description: 'Show the current logged-in Knowledge Planet account from the browser session',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [],
  columns: ['user_id', 'name', 'location', 'user_sid'],
  func: async (page) => {
    requireBrowserSession(page, 'me');
    const user = await ensureZsxqSession(page);
    return [{
      user_id: user?.user_id ?? '',
      user_sid: user?.user_sid ?? '',
      name: user?.name ?? '',
      location: user?.location ?? '',
    }];
  },
});
