import React from 'react';

export function RiskBadge({ level, score, showScore = false }) {
  const config = {
    GREEN: {
      className: 'risk-badge-green',
      label: 'On Track',
    },
    YELLOW: {
      className: 'risk-badge-yellow',
      label: 'Watching',
    },
    RED: {
      className: 'risk-badge-red',
      label: 'At Risk',
    },
  };
  
  const levelConfig = config[level] || config.GREEN;
  
  return (
    <span className={levelConfig.className}>
      {levelConfig.label}
      {showScore && score !== undefined && ` (${score})`}
    </span>
  );
}