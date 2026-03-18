import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 pb-3 pt-0 text-sm transition-colors border-b-2
                ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>{activeTabContent}</div>
    </div>
  );
}
