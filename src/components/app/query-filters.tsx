"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterSelect {
  name: string;
  label: string;
  value?: string;
  /** Valor considered "sem filtro" — não conta como filtro ativo. */
  defaultValue?: string;
  options: { value: string; label: string }[];
}

/**
 * Barra de filtros que escreve em searchParams (Server Components fazem o resto).
 */
export function QueryFilters({
  search,
  selects = [],
  className,
}: {
  search?: { value?: string; placeholder?: string };
  selects?: FilterSelect[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [term, setTerm] = React.useState(search?.value ?? "");

  React.useEffect(() => {
    setTerm(search?.value ?? "");
  }, [search?.value]);

  const apply = React.useCallback(
    (mutate: (sp: URLSearchParams) => void) => {
      const sp = new URLSearchParams(params.toString());
      mutate(sp);
      sp.delete("pagina");
      startTransition(() => {
        router.replace(`${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const debounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const hasFilters =
    Boolean(search?.value) || selects.some((s) => Boolean(s.value && s.value !== (s.defaultValue ?? "todos")));

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {search ? (
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={term}
            onChange={(e) => {
              const value = e.target.value;
              setTerm(value);
              if (debounce.current) clearTimeout(debounce.current);
              debounce.current = setTimeout(() => {
                apply((sp) => {
                  if (value.trim()) sp.set("q", value.trim());
                  else sp.delete("q");
                });
              }, 350);
            }}
            placeholder={search.placeholder ?? "Buscar..."}
            aria-label={search.placeholder ?? "Buscar"}
            className="h-10 pl-9"
          />
        </div>
      ) : null}

      {selects.map((select) => (
        <Select
          key={select.name}
          value={select.value ?? ""}
          onChange={(e) =>
            apply((sp) => {
              if (e.target.value) sp.set(select.name, e.target.value);
              else sp.delete(select.name);
            })
          }
          aria-label={select.label}
          className="h-10 w-full sm:w-auto sm:min-w-[10rem]"
        >
          <option value="">{select.label}</option>
          {select.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ))}

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setTerm("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="gap-1.5"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      ) : null}

      {pending ? (
        <span className="text-xs font-medium text-subtle" role="status" aria-live="polite">
          Atualizando…
        </span>
      ) : null}
    </div>
  );
}
