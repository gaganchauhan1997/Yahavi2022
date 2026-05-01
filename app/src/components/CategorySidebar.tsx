import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  X, ChevronRight, ChevronDown, Layout, FileSpreadsheet, Presentation,
  Megaphone, BarChart3, Share2, Gift, Brain, GraduationCap, Map as MapIcon, ShieldCheck,
  Folder, FolderOpen, Loader2,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { categories } from "@/data/products";
import { API_BASE } from "@/lib/api-base";
import { HIDDEN_CAT_SLUGS } from "@/lib/hidden-cats";

type WPCat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  description?: string;
};

type CatNode = WPCat & { children: CatNode[] };

const topIcons: Record<string, React.ReactNode> = {
  "themes-templates": <Layout className="w-5 h-5" />,
  "website-templates": <Layout className="w-5 h-5" />,
  "html-templates": <Layout className="w-5 h-5" />,
  "excel-sheets": <FileSpreadsheet className="w-5 h-5" />,
  "powerpoint-decks": <Presentation className="w-5 h-5" />,
  "digital-marketing": <Megaphone className="w-5 h-5" />,
  "dm": <Megaphone className="w-5 h-5" />,
  "hr-finance": <BarChart3 className="w-5 h-5" />,
  "social-media": <Share2 className="w-5 h-5" />,
  "free-resources": <Gift className="w-5 h-5" />,
};

// HIDE_SLUGS now lives in lib/hidden-cats.ts (shared with ShopPage + MobileSidebar)
const HIDE_SLUGS = HIDDEN_CAT_SLUGS;

function buildTree(flat: WPCat[]): CatNode[] {
  const byId = new Map<number, CatNode>();
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: CatNode[] = [];
  byId.forEach((node) => {
    if (HIDE_SLUGS.has(node.slug)) return;
    if (node.parent && byId.has(node.parent)) {
      byId.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortNodes = (arr: CatNode[]) => {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    arr.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

/* Recursive sub-cat row (depth 1+). Only depth ≤ 2 children are expandable. */
function SubcatRow({
  node,
  depth,
  parentSlug,
  onNavigate,
}: {
  node: CatNode;
  depth: number;
  parentSlug: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasKids = node.children.length > 0 && depth < 3;
  const indent = depth === 1 ? "ml-4" : "ml-8";

  return (
    <div>
      <div className={`flex items-center gap-1 ${indent} mr-2`}>
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-1 hover:bg-hack-black/5 rounded"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? (
              <ChevronDown className="w-3 h-3 text-hack-black/50" />
            ) : (
              <ChevronRight className="w-3 h-3 text-hack-black/50" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Link
          to={`/shop/${parentSlug}?sub=${node.slug}`}
          onClick={onNavigate}
          className="flex-1 px-2 py-1.5 text-xs text-hack-black/70 hover:text-hack-black hover:bg-hack-black/5 rounded-lg transition-colors flex items-center gap-1.5 min-w-0"
        >
          {depth >= 2 && <span className="text-hack-black/30">└</span>}
          <span className="truncate">{node.name}</span>
          {node.count > 0 && (
            <span className="font-mono text-[10px] text-hack-black/40 ml-auto pl-1">
              {node.count}
            </span>
          )}
        </Link>
      </div>
      {open && hasKids && (
        <div className="space-y-0.5">
          {node.children.map((c) => (
            <SubcatRow
              key={c.id}
              node={c}
              depth={depth + 1}
              parentSlug={parentSlug}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategorySidebar() {
  const { state, dispatch } = useStore();
  const closeSidebar = () => dispatch({ type: "TOGGLE_SIDEBAR" });

  const [tree, setTree] = useState<CatNode[] | null>(null);
  const [openTop, setOpenTop] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Lazy fetch: only when sidebar first opens
  useEffect(() => {
    if (!state.isSidebarOpen || tree !== null || loading) return;
    setLoading(true);
    fetch(`${API_BASE}/wp-json/wp/v2/product_cat?per_page=100&hide_empty=false&_fields=id,name,slug,parent,count`)
      .then((r) => (r.ok ? r.json() : []))
      .then((flat: WPCat[]) => {
        if (!Array.isArray(flat) || flat.length === 0) {
          setTree([]);
        } else {
          setTree(buildTree(flat));
        }
      })
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [state.isSidebarOpen, tree, loading]);

  const fallback = useMemo<CatNode[]>(
    () =>
      categories.map((c, i) => ({
        id: -1 - i,
        name: c.title,
        slug: c.slug,
        parent: 0,
        count: c.itemCount,
        children: c.subcategories.map((s, j) => ({
          id: -1000 - j,
          name: s.name,
          slug: s.slug,
          parent: -1 - i,
          count: 0,
          children: [],
        })),
      })),
    [],
  );

  const roots = tree && tree.length > 0 ? tree : fallback;

  return (
    <>
      {state.isSidebarOpen && (
        <div
          className="fixed inset-0 bg-hack-black/30 z-50 backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-hack-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
          state.isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-hack-black/10">
            <h2 className="font-display font-bold text-lg">Categories</h2>
            <button
              onClick={closeSidebar}
              className="p-2 hover:bg-hack-black/5 rounded-full transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Tree */}
          <div className="flex-1 overflow-y-auto py-3">
            {loading && tree === null && (
              <div className="px-5 py-2 text-xs text-hack-black/40 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading…
              </div>
            )}
            <nav className="space-y-0.5 px-3">
              {roots.map((cat) => {
                const isOpen = !!openTop[cat.id];
                const hasKids = cat.children.length > 0;
                const icon = topIcons[cat.slug] ?? (
                  isOpen ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />
                );
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-1 group">
                      {hasKids ? (
                        <button
                          type="button"
                          onClick={() => setOpenTop((m) => ({ ...m, [cat.id]: !m[cat.id] }))}
                          className="p-1.5 hover:bg-hack-black/5 rounded-md"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-hack-black/60" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-hack-black/60" />
                          )}
                        </button>
                      ) : (
                        <span className="w-7" />
                      )}
                      <Link
                        to={`/shop/${cat.slug}`}
                        onClick={closeSidebar}
                        className="flex-1 flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-hack-yellow/30 transition-colors min-w-0"
                      >
                        <span className="text-hack-black/70 shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{cat.name}</p>
                          {cat.count > 0 && (
                            <p className="text-[10px] text-hack-black/45 font-mono">
                              {cat.count.toLocaleString()} items
                            </p>
                          )}
                        </div>
                      </Link>
                    </div>

                    {isOpen && hasKids && (
                      <div className="space-y-0.5 mb-1">
                        {cat.children.map((sub) => (
                          <SubcatRow
                            key={sub.id}
                            node={sub}
                            depth={1}
                            parentSlug={cat.slug}
                            onNavigate={closeSidebar}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Quick Links */}
          <div className="px-5 py-3 border-t border-hack-black/10">
            <p className="text-[10px] font-mono uppercase tracking-widest text-hack-black/45 mb-2">
              Learn & Practice
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/brainxercise" onClick={closeSidebar}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-hack-yellow/40 hover:bg-hack-yellow text-hack-black text-xs font-bold border border-hack-black/20">
                <Brain className="w-4 h-4" /> Brainxercise
              </Link>
              <Link to="/courses" onClick={closeSidebar}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white hover:bg-hack-black/5 text-hack-black text-xs font-bold border border-hack-black/20">
                <GraduationCap className="w-4 h-4" /> Courses
              </Link>
              <Link to="/roadmaps" onClick={closeSidebar}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white hover:bg-hack-black/5 text-hack-black text-xs font-bold border border-hack-black/20">
                <MapIcon className="w-4 h-4" /> Roadmaps
              </Link>
              <Link to="/verify" onClick={closeSidebar}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white hover:bg-hack-black/5 text-hack-black text-xs font-bold border border-hack-black/20">
                <ShieldCheck className="w-4 h-4" /> Verify
              </Link>
            </div>
          </div>

          <div className="p-5 border-t border-hack-black/10 bg-hack-black/[0.02]">
            <Link to="/shop" onClick={closeSidebar}
              className="flex items-center justify-center gap-2 w-full py-3 bg-hack-black text-hack-white rounded-full text-sm font-medium hover:bg-hack-black/80 transition-colors">
              Browse All Products
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
