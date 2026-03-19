import { useState, useRef, useEffect } from 'react';
import { useTranslation } from "react-i18next";

interface MachinesFilterableHeaderProps {
  name: string;
  filterData?: Array<string | number>;
  machineFilters: [string, string | number][] | null;
  onFilterChange: (filter: [string, string | number][] | null) => void;
  children: React.ReactNode;
  enableSearch?: boolean;
  index?: number | null,
}

export function MachinesFilterableHeader({
  name,
  filterData,
  machineFilters,
  onFilterChange,
  children,
  enableSearch = false,
  index = null,
}: MachinesFilterableHeaderProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getLabel: (n: string, i: string) => string = (n, i) => {
    if (n === 'states') {
      switch(i) {
        case ('free'):
          return t("machines.nodeState.free");
        case ('partially_used'):
          return t("machines.nodeState.partiallyUsed");
        case ('used'):
          return t("machines.nodeState.used");
        case ('maintenance'):
          return t("machines.nodeState.maintenance");
        case ('not-available'):
          return t("machines.nodeState.notAvailable");
        case ('unknown'):
          return t("machines.nodeState.unknown");
        case ('noPbs'):
          return t("machines.noPbs");
        default:
          return i;
      }
    }
    return i;
  };

  const stateOptions: { value: string; label: string }[] = [
    { value: "all", label: t("machines.all") },
    ...(filterData
      ? filterData.map((item) => ({
        value: item as string,
        label: getLabel(name, item as string),
      })): []),
  ];

  // Filter options based on search query
  const filteredOptions = stateOptions.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selected = machineFilters?.filter(([key]) =>
    key === name
  );

  const selectedIndex =
    typeof index === 'number'
      ? (index < (selected ? selected?.length : 0)
        ? index
        : (selected ? selected?.length : 0))
      : 0;

  const selectedValue = (selected && selected?.length > selectedIndex) ?
    selected[selectedIndex][1] :
    'all';

  const selectedLabel = stateOptions.find(opt => opt.value === selectedValue)?.label || t("machines.all");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (value: string | number) => {
    // Copy the current filters
    const oldFilters: [string, string | number][] = machineFilters ? [...machineFilters] : [];

    const oldValueExist = oldFilters.some(([k, v]) => k === name && v === selectedValue);

    const newfilter: [string, string | number][] = oldValueExist ?
      (oldFilters.map(([k, v]) => {
        if (k === name && v === selectedValue) {
          // Replace old value
          return [k, value];
        }
        return [k, v];
      }) as [string, string | number][]).filter(([_, v]) => v !== 'all'):
      ([ ...oldFilters, [name, value]] as [string, string | number][]).filter(([_, v]) => v !== 'all');

    // Finalize and update
    onFilterChange?.(newfilter.length > 0 ? newfilter : null);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    const currentFilters: [string, string | number][] = machineFilters ? [...machineFilters] : [];

    // 2. Filter out ONLY the specific key-value pair we want to remove
    const updatedFilters = currentFilters.filter(([k, v]) =>
      !(k === name && v === selectedValue)
    );

    // 3. Notify the parent: send the new array, or null if it's now empty
    onFilterChange?.(updatedFilters.length > 0 ? updatedFilters : null);
  };

  // Render searchable dropdown
  if (enableSearch) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {/* Label */}
        {children && (
          <div className="text-sm text-gray-700 font-medium w-full">
            {children}
          </div>
        )}

        <div className="relative w-full" ref={dropdownRef}>
          {/* Trigger Button */}
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:border-gray-400 transition-colors focus-within:ring-2 focus-within:ring-primary-500"
          >
            <span className="truncate mr-8">{selectedLabel}</span>

            {/* Chevron Icon */}
            <div className="flex items-center">
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Clear Button (Positioned inside the relative wrapper, outside the toggle div) */}
          {selectedValue !== 'all' && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent dropdown from toggling
                handleClear();
              }}
              className="absolute inset-y-0 right-8 flex items-center px-2 text-gray-400 hover:text-gray-600 focus:outline-none"
              title={t("clear")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-50 w-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
              {/* Search Input Container */}
              <div className="p-2 bg-gray-50 border-b">
                <input
                  type="text"
                  placeholder={t("machines.searchFilterPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 px-3 py-1.5"
                  autoFocus
                />
              </div>

              {/* Options List */}
              <div className="overflow-y-auto flex-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-primary-50 transition-colors ${
                      selectedValue === option.value ? 'bg-primary-100 font-semibold text-primary-900' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </div>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="px-3 py-6 text-sm text-gray-500 text-center">
                    {t("no_results")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render default select
  return (
    <div className="flex flex-col gap-2 w-full flex-1">
      {children && (
        <div className="text-sm text-gray-700 font-medium w-full">
          {children}
        </div>
      )}
      <div className="relative w-full">
        <select
          value={selectedValue}
          onChange={(e) => handleSelect(e.target.value)}
          /* - Changed pr-20 to pr-8 (or pr-10 if the Clear button is visible).
            - This prevents the text from being squeezed out on small widths.
          */
          className={`w-full text-sm text-gray-700 bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 leading-5 appearance-none cursor-pointer hover:border-slate-400 transition-colors focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${
            selectedValue !== 'all' ? 'pr-14' : 'pr-8'
          }`}
        >
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>

        {/* Clear Button - Positioned closer to the chevron */}
        {selectedValue !== 'all' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleClear();
            }}
            className="absolute inset-y-0 right-7 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            title={t("clear")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
