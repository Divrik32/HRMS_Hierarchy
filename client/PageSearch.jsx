import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// =========================================
// Shared "search all pages" bar + popup for the navbars.
//
// Props
//   pages: [{ label, section, path, icon, end?, keywords?, onSelect? }]
//   onOpenChange?: (isOpen) => void   (use it to lazy-load data)
//
// Renders the centered search bar (and an icon button on small screens),
// the Ctrl/Cmd + K shortcut, and the popup. Put it between the left and
// right sections of the navbar.
// =========================================

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const PageSearch = ({ pages, onOpenChange }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const searchTriggerRef = useRef(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const isMac =
    typeof navigator !== "undefined" &&
    /mac/i.test(navigator.platform || "");

  // Ctrl/Cmd + K
  useEffect(() => {
    const handleShortcut = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setPaletteOpen((previous) => !previous);
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Reset query each time the popup opens + tell the parent
  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActiveIndex(0);
    }
    onOpenChangeRef.current?.(paletteOpen);
  }, [paletteOpen]);

  const trimmedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmedQuery) return pages;

    const tokens = trimmedQuery.split(/\s+/);

    return pages.filter((page) => {
      const haystack =
        `${page.label} ${page.section} ${page.keywords || ""}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [pages, trimmedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery]);

  useEffect(() => {
    if (!paletteOpen) return;
    document
      .getElementById(`page-search-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, paletteOpen]);

  const closePalette = () => {
    setPaletteOpen(false);
    searchTriggerRef.current?.focus();
  };

  const goToPage = (page) => {
    if (!page) return;
    page.onSelect?.();
    setPaletteOpen(false);
    navigate(page.path);
  };

  const handlePaletteKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) =>
        results.length ? (previous + 1) % results.length : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) =>
        results.length
          ? (previous - 1 + results.length) % results.length
          : 0
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      goToPage(results[activeIndex]);
    }
  };

  const isCurrentPage = (page) =>
    page.end
      ? pathname === page.path
      : pathname === page.path || pathname.startsWith(`${page.path}/`);

  return (
    <>
      {/* Center Section: page search */}
      <div className="flex min-w-0 flex-1 justify-center px-3 sm:px-6">
        <button
          ref={searchTriggerRef}
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          aria-label="Search pages"
          className={`hidden h-11 w-full max-w-2xl items-center gap-3 rounded-xl border border-transparent bg-[#ededed] px-3.5 text-left text-sm text-slate-600 transition hover:bg-[#e3e3e3] sm:flex ${focusRing}`}
        >
          <Search size={17} aria-hidden="true" className="shrink-0" />
          <span className="flex-1 truncate">Search pages...</span>
          <kbd className="rounded-md border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-700">
            {isMac ? "⌘ K" : "Ctrl K"}
          </kbd>
        </button>

        {/* Small screens: icon only */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          aria-label="Search pages"
          className={`ml-auto rounded-lg p-2 text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 sm:hidden ${focusRing}`}
        >
          <Search size={21} aria-hidden="true" />
        </button>
      </div>

      {/* ===================== SEARCH POPUP ===================== */}
      {paletteOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[10vh]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePalette();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search pages"
              onKeyDown={handlePaletteKeyDown}
              className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/20"
            >
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-5">
                <Search
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-slate-600"
                />

                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try a page or company name"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="page-search-list"
                  aria-activedescendant={
                    results.length
                      ? `page-search-option-${activeIndex}`
                      : undefined
                  }
                  aria-label="Search pages"
                  className="h-14 min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus:outline-none"
                />

                <kbd className="rounded-md border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <ul
                id="page-search-list"
                role="listbox"
                aria-label="Pages"
                className="max-h-[50vh] overflow-y-auto overscroll-contain p-2 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]"
              >
                {results.length === 0 && (
                  <li
                    role="presentation"
                    className="px-4 py-8 text-center text-sm text-slate-600"
                  >
                    No pages match “{query.trim()}”.
                  </li>
                )}

                {results.map((page, index) => {
                  const Icon = page.icon;
                  const isActive = index === activeIndex;
                  const showHeading =
                    !trimmedQuery &&
                    (index === 0 ||
                      results[index - 1].section !== page.section);

                  return (
                    <li key={page.path} role="presentation">
                      {showHeading && (
                        <div className="px-3 pb-1 pt-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate-600">
                          {page.section}
                        </div>
                      )}

                      <div
                        id={`page-search-option-${index}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goToPage(page)}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-800",
                        ].join(" ")}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                          <Icon
                            size={17}
                            aria-hidden="true"
                            className={
                              isActive ? "text-slate-900" : "text-slate-600"
                            }
                          />
                        </span>

                        <span className="flex-1 truncate text-base">
                          {page.label}
                        </span>

                        {isCurrentPage(page) ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Current
                          </span>
                        ) : (
                          trimmedQuery && (
                            <span className="font-mono text-xs text-slate-600">
                              {page.section}
                            </span>
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Footer hints */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-200 px-5 py-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-300 p-1">
                    <ArrowUp size={12} aria-hidden="true" />
                  </kbd>
                  <kbd className="rounded border border-slate-300 p-1">
                    <ArrowDown size={12} aria-hidden="true" />
                  </kbd>
                  to navigate
                </span>

                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-300 p-1">
                    <CornerDownLeft size={12} aria-hidden="true" />
                  </kbd>
                  to open
                </span>

                <span className="ml-auto hidden sm:inline">
                  Type a page or section name to filter
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default PageSearch;