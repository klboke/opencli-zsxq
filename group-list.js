import { cli, Strategy } from './opencli-compat.js';

import {
  readManagedGroups,
  requireBrowserSession,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'group-list',
  description: 'List Knowledge Planet groups that the current account can manage',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [],
  columns: ['group_id', 'name', 'type', 'owner_user_id', 'create_time'],
  func: async (page) => {
    requireBrowserSession(page, 'group-list');
    const groups = await readManagedGroups(page);
    return groups.map((group) => ({
      group_id: group.group_id ?? '',
      name: group.name ?? '',
      type: group.type ?? '',
      owner_user_id: group.owner?.user_id ?? '',
      create_time: group.create_time ?? '',
    }));
  },
});
