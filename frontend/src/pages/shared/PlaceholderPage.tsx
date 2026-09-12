import React from 'react';
import { ComingSoonCard } from '../../components/ui/index';
import { useTranslation } from 'react-i18next';

export const PlaceholderPage: React.FC<{ titleKey: string; phase: number; descriptionKey?: string }> = ({
  titleKey,
  phase,
  descriptionKey,
}) => {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl mx-auto">
      <ComingSoonCard
        title={t(titleKey)}
        phase={phase}
        description={descriptionKey ? t(descriptionKey) : undefined}
      />
    </div>
  );
};
