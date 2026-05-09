import React, { useState, useEffect, useRef } from "react";
import {
  getCategories,
  addCategoryAPI,
  deleteCategoryAPI,
} from "../api/categoryApi";

/* ─── tiny helpers ─────────────────────────────────────────── */
const TYPE_LABELS = { income: "Income", expense: "Expense" };
const TYPE_COLORS = {
  income: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  expense: "bg-red-500/15 text-red-400 border-red-500/30",
};

/* ─── sub-components ────────────────────────────────────────── */

function PageHeader({ total }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-primaryText leading-tight">
          Categories
        </h1>
        <p className="text-sm text-secondaryText mt-0.5">
          {total} {total === 1 ? "category" : "categories"} total
        </p>
      </div>
    </div>
  );
}

function FilterTabs({ active, onChange, counts }) {
  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "income", label: "Income", count: counts.income },
    { key: "expense", label: "Expense", count: counts.expense },
  ];
  return (
    <div className="flex gap-1 p-1 bg-inputBg border border-border rounded-lg w-fit mb-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
            active === t.key
              ? "bg-accent text-white shadow-sm"
              : "text-secondaryText hover:text-primaryText"
          }`}
        >
          {t.label}
          <span
            className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              active === t.key
                ? "bg-white/20 text-white"
                : "bg-border text-secondaryText"
            }`}
          >
            {t.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function AddCategoryForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const added = await addCategoryAPI({ name: trimmed, type });
      onAdd(added);
      setName("");
      setOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add category.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accentHover text-white text-sm font-medium rounded-lg transition-all duration-150 hover:shadow-md hover:shadow-accent/20 mb-5"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        New Category
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="flex flex-col sm:flex-row gap-2 mb-5 p-3 bg-card border border-border rounded-xl animate-in"
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Category name…"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
        className={`flex-1 min-w-0 bg-inputBg border rounded-lg px-3 py-2 text-sm text-primaryText placeholder:text-secondaryText focus:outline-none focus:ring-2 focus:ring-accent transition-all ${
          error ? "border-red-500 focus:ring-red-500" : "border-border"
        }`}
      />

      {/* Type selector */}
      <div className="flex gap-1 bg-inputBg border border-border rounded-lg p-1 shrink-0">
        {["expense", "income"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
              type === t
                ? t === "income"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
                : "text-secondaryText hover:text-primaryText"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent hover:bg-accentHover text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
            setName("");
          }}
          className="px-3 py-2 border border-border rounded-lg text-sm text-secondaryText hover:text-primaryText hover:bg-inputBg transition"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="w-full text-xs text-red-400 px-1 -mt-1 sm:col-span-full">
          {error}
        </p>
      )}
    </form>
  );
}

function CategoryCard({ category, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteCategoryAPI(category._id);
      onDelete(category._id);
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="group flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-accent/40 hover:bg-[#1c1c21] transition-all duration-150">
      <div className="flex items-center gap-3 min-w-0">
        {/* Icon bubble */}
        <span
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
            category.type === "income"
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {category.name.charAt(0).toUpperCase()}
        </span>

        <span className="text-sm font-medium text-primaryText truncate">
          {category.name}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Type badge */}
        <span
          className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            TYPE_COLORS[category.type]
          }`}
        >
          {TYPE_LABELS[category.type]}
        </span>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          onBlur={() => setConfirming(false)}
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all duration-150 ${
            confirming
              ? "bg-red-500 text-white hover:bg-red-600"
              : "text-secondaryText hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
          } disabled:opacity-40`}
        >
          {deleting ? "…" : confirming ? "Confirm" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ filter }) {
  const messages = {
    all: {
      icon: "📂",
      title: "No categories yet",
      sub: "Add your first category above to start organizing transactions.",
    },
    income: {
      icon: "📈",
      title: "No income categories",
      sub: "Add income sources like Salary or Freelance.",
    },
    expense: {
      icon: "🧾",
      title: "No expense categories",
      sub: "Add expense types like Food or Transport.",
    },
  };
  const m = messages[filter];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4 select-none">{m.icon}</span>
      <p className="text-primaryText font-medium mb-1">{m.title}</p>
      <p className="text-secondaryText text-sm max-w-xs">{m.sub}</p>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-14 bg-card border border-border rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────── */

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAdd = (added) => setCategories((prev) => [...prev, added]);
  const handleDelete = (id) =>
    setCategories((prev) => prev.filter((c) => c._id !== id));

  const counts = {
    all: categories.length,
    income: categories.filter((c) => c.type === "income").length,
    expense: categories.filter((c) => c.type === "expense").length,
  };

  const visible =
    filter === "all" ? categories : categories.filter((c) => c.type === filter);

  return (
    <div className="min-h-screen bg-background text-primaryText p-4 sm:p-6 max-w-4xl mx-auto">
      <PageHeader total={categories.length} />

      <AddCategoryForm onAdd={handleAdd} />

      <FilterTabs active={filter} onChange={setFilter} counts={counts} />

      {loading ? (
        <SkeletonLoader />
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((cat) => (
            <CategoryCard
              key={cat._id}
              category={cat}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;
