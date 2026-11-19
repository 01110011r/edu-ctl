// Usage: <SearchInput value={search} onChange={setSearch} placeholder="Qidirish..." />
"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Qidirish...",
  debounceMs = 300,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [draft, debounceMs, onChange, value]);

  function clearSearch() {
    setDraft("");
    onChange("");
  }

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className="h-10 pr-10 pl-9"
      />
      {draft ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={clearSearch}
          aria-label="Qidiruvni tozalash"
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
