import React from 'react';
import { ApiItem } from '../../types/api';
import { ApiDocumentationView } from '../ApiDocumentationView';

export interface EndpointsDocsTabProps {
  api: ApiItem;
  onSelectEndpointForPlayground: (
    endpoint: string,
    method: string,
    params?: Record<string, string>,
    body?: string
  ) => void;
}

export const EndpointsDocsTab: React.FC<EndpointsDocsTabProps> = ({
  api,
  onSelectEndpointForPlayground
}) => {
  return (
    <section
      role="tabpanel"
      id="tabpanel-docs"
      aria-labelledby="tab-docs"
      className="space-y-4 animate-in fade-in duration-200"
    >
      <ApiDocumentationView
        api={api}
        onSelectEndpointForPlayground={onSelectEndpointForPlayground}
      />
    </section>
  );
};
