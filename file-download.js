import { cli, Strategy } from './opencli-compat.js';

import {
  downloadAttachmentToDir,
  readFileInfo,
  requireBrowserSession,
  ZSXQ_DOMAIN,
} from './zsxq-shared.js';

cli({
  site: 'zsxq',
  name: 'file-download',
  description: 'Download a Knowledge Planet attachment by file id to a local directory',
  domain: ZSXQ_DOMAIN,
  strategy: Strategy.HEADER,
  browser: true,
  args: [
    { name: 'file-id', positional: true, required: true, help: 'Attachment file_id from topic-files or topic/comment payloads' },
    { name: 'output-dir', default: './downloads', help: 'Directory used to save the downloaded attachment' },
    { name: 'name', help: 'Optional filename override' },
  ],
  columns: ['file_id', 'file_name', 'file_size', 'saved_path', 'download_url'],
  func: async (page, kwargs) => {
    requireBrowserSession(page, 'file-download');

    const fileId = String(kwargs['file-id']);
    const info = await readFileInfo(page, fileId);
    const result = await downloadAttachmentToDir(page, fileId, kwargs['output-dir'], kwargs.name);

    return [{
      file_id: fileId,
      file_name: result.info?.name ?? info?.name ?? kwargs.name ?? '',
      file_size: result.info?.size ?? info?.size ?? result.size ?? 0,
      saved_path: result.filePath,
      download_url: result.downloadUrl,
    }];
  },
});
