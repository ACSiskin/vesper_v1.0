import React from 'react';
import { TargetProfile } from '@/types';

interface RawPanelProps {
  target: TargetProfile;
}

export const RawPanel: React.FC<RawPanelProps> = ({ target }) => {
  return (
    <div className="animate-in fade-in duration-300">
        <h3 className="text-green-500 font-bold mb-2 text-sm border-b border-gray-800 pb-1">:: RAW_JSON_DUMP</h3>
        <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap bg-gray-900/30 p-2 rounded border border-gray-800">
            {JSON.stringify(target, null, 2)}
        </pre>
    </div>
  );
};
