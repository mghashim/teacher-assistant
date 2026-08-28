import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string | number;
  label: string;
  group?: string;
}

export interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  selectedValues: Array<string | number>;
  onChange: (values: Array<string | number>) => void;
  placeholder?: string;
  className?: string;
  allOptionLabel?: string;
}

export function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Select items...",
  className,
  allOptionLabel = "Select All",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAllSelected =
    options.length > 0 && selectedValues.length === options.length;

  const handleToggleOption = (value: string | number) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const selectedLabels = options
    .filter((o) => selectedValues.includes(o.value))
    .map((o) => o.label);

  return (
    <div className={cn("w-full space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-h-[36px] w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring text-left"
        >
          <div className="flex flex-wrap gap-1 items-center max-w-[90%] overflow-hidden">
            {selectedValues.length === 0 ? (
              <span className="text-muted-foreground text-xs">{placeholder}</span>
            ) : isAllSelected ? (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                All Selected ({options.length})
              </span>
            ) : (
              selectedLabels.slice(0, 2).map((lbl, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-medium truncate max-w-[140px]"
                >
                  {lbl}
                </span>
              ))
            )}
            {!isAllSelected && selectedValues.length > 2 && (
              <span className="text-xs text-muted-foreground font-medium">
                +{selectedValues.length - 2} more
              </span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-lg p-1 animate-in fade-in zoom-in-95">
            {/* Quick Actions */}
            <div className="flex items-center justify-between p-1.5 border-b mb-1 text-xs">
              <button
                type="button"
                onClick={handleToggleAll}
                className="font-medium text-primary hover:underline"
              >
                {isAllSelected ? "Deselect All" : allOptionLabel}
              </button>
              {selectedValues.length > 0 && !isAllSelected && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleToggleOption(option.value)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
