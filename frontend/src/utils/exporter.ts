import { ApiItem } from '../types/api';

/**
 * Generates Postman Collection v2.1 schema JSON for a single API or array of APIs
 */
export function generatePostmanCollection(apis: ApiItem | ApiItem[], collectionName?: string): string {
  const apiList = Array.isArray(apis) ? apis : [apis];
  const name = collectionName || (Array.isArray(apis) ? 'Free API Hub Collection' : `${apis.name} Collection`);
  const collection = {
    info: {
      _postman_id: Math.random().toString(36).substring(2, 15),
      name,
      description: 'Exported from Free API Hub. Verified 100% free endpoints.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: apiList.map((api) => {
      const fullUrl = `${api.base_url.replace(/\/+$/, '')}${api.sample_endpoint.startsWith('/') ? '' : '/'}${api.sample_endpoint}`;
      const urlObj = new URL(fullUrl.startsWith('http') ? fullUrl : `https://${fullUrl}`);

      return {
        name: api.name,
        request: {
          method: api.method || 'GET',
          header: [
            {
              key: 'Accept',
              value: 'application/json',
              type: 'text'
            },
            ...(api.default_headers
              ? Object.entries(api.default_headers).map(([k, v]) => ({
                  key: k,
                  value: v,
                  type: 'text'
                }))
              : [])
          ],
          url: {
            raw: fullUrl,
            protocol: urlObj.protocol.replace(':', ''),
            host: urlObj.hostname.split('.'),
            path: urlObj.pathname.split('/').filter(Boolean),
            query: Array.from(urlObj.searchParams.entries()).map(([k, v]) => ({
              key: k,
              value: v
            }))
          },
          description: `${api.short_description || api.description}\n\nOfficial Docs: ${api.documentation_url}`
        },
        response: []
      };
    })
  };

  return JSON.stringify(collection, null, 2);
}

/**
 * Generates a VS Code REST Client (.http) file format
 */
export function generateHttpFileSnippet(api: ApiItem): string {
  const fullUrl = `${api.base_url.replace(/\/+$/, '')}${api.sample_endpoint.startsWith('/') ? '' : '/'}${api.sample_endpoint}`;
  let content = `### ${api.name}\n`;
  content += `# ${api.short_description || api.description}\n`;
  content += `# Documentation: ${api.documentation_url}\n`;
  content += `${api.method || 'GET'} ${fullUrl}\n`;
  content += `Accept: application/json\n`;
  content += `User-Agent: FreeAPIHub/1.0\n`;

  if (api.default_headers) {
    for (const [k, v] of Object.entries(api.default_headers)) {
      content += `${k}: ${v}\n`;
    }
  }

  content += `\n`;
  return content;
}

/**
 * Helper to download any string content as a client-side file
 */
export function downloadFile(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
