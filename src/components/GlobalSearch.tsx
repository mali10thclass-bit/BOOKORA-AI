import React, { useState, useRef, useEffect, useCallback } from "react";
import { useBusiness } from "@/lib/store";
import { can } from "@/lib/permissions";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  X,
  Clock,
  User,
  CalendarDays,
  Scissors,
  UserCog,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Trash2,
} from "lucide-react";

interface GlobalSearchProps {
  onNavigate?: (view: string) => void;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const { customers, appointments, services, staff } = useBusiness();
  const {
    query,
    setQuery,
    results,
    isOpen,
    setIsOpen,
    recentSearches,
    clearRecentSearches,
    addRecentSearch,
  } = useGlobalSearch();

  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showDropdown = isOpen && focused && query.trim().length > 0;
  const showRecent = isOpen && focused && query.trim().length === 0 && recentSearches.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (result: typeof results[0]) => {
      addRecentSearch(query);
      setQuery("");
      setFocused(false);

      switch (result.type) {
        case "customer":
          onNavigate?.("customers");
          break;
        case "appointment":
          onNavigate?.("appointments");
          break;
        case "service":
          onNavigate?.("services");
          break;
        case "staff":
          onNavigate?.("staff");
          break;
      }
    },
    [query, setQuery, addRecentSearch, onNavigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setFocused(false);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  const typeIcons: Record<string, React.ElementType> = {
    customer: User,
    appointment: CalendarDays,
    service: Scissors,
    staff: UserCog,
  };

  const typeColors: Record<string, string> = {
    customer: "from-blue-500 to-indigo-500",
    appointment: "from-emerald-500 to-teal-500",
    service: "from-purple-500 to-violet-500",
    staff: "from-amber-500 to-orange-500",
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search customers, appointments, services, staff..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-3 text-sm"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {(showDropdown || showRecent) && (
        <Card className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden border border-slate-200 shadow-xl">
          <div className="max-h-96 overflow-y-auto">
            {showRecent && (
              <div className="border-b border-slate-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Recent Searches
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={clearRecentSearches}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(search);
                      setFocused(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {search}
                  </button>
                ))}
              </div>
            )}

            {showDropdown && results.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p>No results found</p>
              </div>
            )}

            {showDropdown && results.length > 0 && (
              <div className="p-2">
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type];
                  const color = typeColors[result.type];
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-sm`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {result.name}
                          </p>
                          <Badge
                            variant={
                              result.type === "customer"
                                ? result.status === "active"
                                  ? "success"
                                  : "secondary"
                                : result.type === "appointment"
                                ? "info"
                                : result.status === "Active" || result.status === "confirmed"
                                ? "success"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {result.type}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                          {result.relevantInfo}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
