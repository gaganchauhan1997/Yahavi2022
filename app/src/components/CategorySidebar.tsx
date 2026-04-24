import { Link } from "react-router-dom";
import { X, ChevronRight, Layout, FileSpreadsheet, Presentation, Megaphone, BarChart3, Share2, Gift } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { categories } from "@/data/products";

const categoryIcons: Record<string, React.ReactNode> = {
  "themes-templates": <Layout className="w-5 h-5" />,
  "excel-sheets": <FileSpreadsheet className="w-5 h-5" />,
  "powerpoint-decks": <Presentation className="w-5 h-5" />,
  "digital-marketing": <Megaphone className="w-5 h-5" />,
  "hr-finance": <BarChart3 className="w-5 h-5" />,
  "social-media": <Share2 className="w-5 h-5" />,
  "free-resources": <Gift className="w-5 h-5" />,
};

export default function CategorySidebar() {
  const { state, dispatch } = useStore();

  const closeSidebar = () => dispatch({ type: "TOGGLE_SIDEBAR" });

  return (
    <>
      {/* Backdrop */}
      {state.isSidebarOpen && (
        <div
          className="fixed inset-0 bg-hack-black/30 z-50 backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
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

          {/* Category List */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {categories.map((cat) => (
                <div key={cat.id} className="group">
                  <Link
                    to={`/shop/${cat.slug}`}
                    onClick={closeSidebar}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hack-yellow/30 transition-colors"
                  >
                    <span className="text-hack-black/70">
                      {categoryIcons[cat.slug]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {cat.title}
                      </p>
                      <p className="text-xs text-hack-black/50 font-mono">
                        {cat.itemCount.toLocaleString()} items
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-hack-black/30 group-hover:text-hack-black/70 transition-colors" />
                  </Link>

                  {/* Subcategories */}
                  <div className="ml-11 mr-3 space-y-0.5">
                    {cat.subcategories.slice(0, 4).map((sub) => (
                      <Link
                        key={sub.slug}
                        to={`/shop/${cat.slug}?sub=${sub.slug}`}
                        onClick={closeSidebar}
                        className="block px-3 py-1.5 text-xs text-hack-black/60 hover:text-hack-black hover:bg-hack-black/5 rounded-lg transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-hack-black/10 bg-hack-black/[0.02]">
            <Link
              to="/shop"
              onClick={closeSidebar}
              className="flex items-center justify-center gap-2 w-full py-3 bg-hack-black text-hack-white rounded-full text-sm font-medium hover:bg-hack-black/80 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
