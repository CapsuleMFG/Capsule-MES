interface FilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  blockedCount: number;
}

const TABS = [
  { id: 'All', label: 'All' },
  { id: 'Cutting', label: 'Cutting' },
  { id: 'Forming', label: 'Forming' },
  { id: 'Roll Forming', label: 'Roll Forming' },
  { id: 'CNC', label: 'CNC / Wood' },
  { id: 'Finishing', label: 'Finishing' },
  { id: 'Hardware Insertion', label: 'Hardware' },
  { id: 'Fabrication', label: 'Fabrication' },
];

export default function FilterTabs({ activeTab, onTabChange, blockedCount }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-sm rounded-[10px] whitespace-nowrap transition-colors ${
            activeTab === tab.id
              ? 'bg-gray-900 text-white font-medium'
              : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
      {blockedCount > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-md">
          {blockedCount} blocked
        </span>
      )}
    </div>
  );
}
