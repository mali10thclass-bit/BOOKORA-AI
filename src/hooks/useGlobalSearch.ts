import { useState, useEffect, useCallback, useMemo } from "react";
import { useBusiness } from "@/lib/store";
import { can } from "@/lib/permissions";
import { Appointment, Customer, Service, Staff } from "@/lib/store";

export interface SearchResult {
  id: string;
  type: "customer" | "appointment" | "service" | "staff";
  name: string;
  relevantInfo: string;
  status: string;
  icon: string;
}

const RECENT_SEARCHES_KEY = "bookora_recent_searches";
const MAX_RECENT_SEARCHES = 10;

export function useGlobalSearch() {
  const { customers, appointments, services, staff, business } = useBusiness();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const addRecentSearch = useCallback(
    (search: string) => {
      if (!search.trim()) return;
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== search.toLowerCase());
        const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery.trim()) return [];

    const q = debouncedQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search customers - check permission
    if (can("OWNER", "customers.manage") || can("ADMIN", "customers.manage")) {
      customers
        .filter(
          (c) =>
            c.fullName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.includes(q)
        )
        .forEach((c) => {
          searchResults.push({
            id: c.id,
            type: "customer",
            name: c.fullName,
            relevantInfo: c.email || c.phone,
            status: c.status,
            icon: "User",
          });
        });
    }

    // Search appointments - check permission
    if (can("OWNER", "appointments.manage") || can("ADMIN", "appointments.manage")) {
      appointments
        .filter(
          (a) =>
            a.customerName.toLowerCase().includes(q) ||
            a.serviceName.toLowerCase().includes(q) ||
            a.staffName.toLowerCase().includes(q)
        )
        .forEach((a) => {
          searchResults.push({
            id: a.id,
            type: "appointment",
            name: `${a.customerName} - ${a.serviceName}`,
            relevantInfo: `${a.staffName} • ${a.date} at ${a.startTime}`,
            status: a.status,
            icon: "Calendar",
          });
        });
    }

    // Search services - check permission
    if (can("OWNER", "services.manage") || can("ADMIN", "services.manage")) {
      services
        .filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
        .forEach((s) => {
          searchResults.push({
            id: s.id,
            type: "service",
            name: s.name,
            relevantInfo: `${s.duration}min • ${business?.currency === "USD" ? "$" : "₨"}${s.price}`,
            status: s.active ? "Active" : "Inactive",
            icon: "Scissors",
          });
        });
    }

    // Search staff - check permission
    if (can("OWNER", "staff.manage") || can("ADMIN", "staff.manage")) {
      staff
        .filter((s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q))
        .forEach((s) => {
          searchResults.push({
            id: s.id,
            type: "staff",
            name: s.name,
            relevantInfo: s.role,
            status: s.active ? "Active" : "Inactive",
            icon: "UserCog",
          });
        });
    }

    return searchResults.slice(0, 20);
  }, [debouncedQuery, customers, appointments, services, staff, business]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim()) {
        addRecentSearch(value.trim());
      }
    },
    [addRecentSearch]
  );

  return {
    query,
    setQuery: handleSearch,
    debouncedQuery,
    results,
    isOpen,
    setIsOpen,
    recentSearches,
    clearRecentSearches,
    addRecentSearch,
  };
}
