import React from 'react';
import { ApiItem } from '../../types/api';
import { Playground } from '../playground';

export interface PlaygroundTabProps {
  api: ApiItem;
  initialEndpoint?: string;
  initialMethod?: string;
  initialParams?: Record<string, string>;
  initialBody?: string;
  onOpenDocs: () => void;
  onOpenAuthModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenHistoryModal?: () => void;
  onOpenClientCodeModal?: () => void;
}

export const PlaygroundTab: React.FC<PlaygroundTabProps> = ({
  api,
  initialEndpoint,
  initialMethod,
  initialParams,
  initialBody,
  onOpenDocs,
  onOpenAuthModal,
  onOpenSettingsModal,
  onOpenHistoryModal,
  onOpenClientCodeModal
}) => {
  return (
    <section
      role="tabpanel"
      id="tabpanel-playground"
      aria-labelledby="tab-playground"
      className="space-y-4 animate-in fade-in duration-200"
    >
      <Playground
        api={api}
        initialEndpoint={initialEndpoint}
        initialMethod={initialMethod}
        initialParams={initialParams}
        initialBody={initialBody}
        onOpenDocs={onOpenDocs}
        onOpenAuthModal={onOpenAuthModal}
        onOpenSettingsModal={onOpenSettingsModal}
        onOpenHistoryModal={onOpenHistoryModal}
        onOpenClientCodeModal={onOpenClientCodeModal}
      />
    </section>
  );
};
