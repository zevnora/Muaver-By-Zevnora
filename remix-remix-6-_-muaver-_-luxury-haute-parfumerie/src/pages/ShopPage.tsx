import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { Product, SiteSettings } from '../types/store';
import { ProductCard } from '../components/ProductCard';

interface ShopPageProps {
  products: Product[];
  settings: SiteSettings;
  onNavigate?: (page: string, productId?: string) => void;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  settings,
  onNavigate,
  onAddToCart,
}) => {
  useEffect(() => {
    document.title = 'Shop | MUAVER';
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'name'>('featured');

  // Filter out Draft products from the storefront entirely
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.status !== 'draft');
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    activeProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    return activeProducts
      .filter((p) => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.notes && Object.values(p.notes).flat().some(n => n.toLowerCase().includes(searchTerm.toLowerCase())));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') {
          const priceA = a.variants && a.variants.length > 0 ? Math.min(...a.variants.map((v) => Number(v.price) || 0)) : (Number(a.price) || 0);
          const priceB = b.variants && b.variants.length > 0 ? Math.min(...b.variants.map((v) => Number(v.price) || 0)) : (Number(b.price) || 0);
          return priceA - priceB;
        }
        if (sortBy === 'price-high') {
          const priceA = a.variants && a.variants.length > 0 ? Math.min(...a.variants.map((v) => Number(v.price) || 0)) : (Number(a.price) || 0);
          const priceB = b.variants && b.variants.length > 0 ? Math.min(...b.variants.map((v) => Number(v.price) || 0)) : (Number(b.price) || 0);
          return priceB - priceA;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [activeProducts, searchTerm, selectedCategory, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 space-y-8 text-slate-800">
      
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold">
          The Fragrance Collection
        </span>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          ALL PERFUMES
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">
          Crafted with high oil concentrations, long-lasting performance, and Cash on Delivery across Pakistan.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, note..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end text-xs">
            <span className="text-slate-500 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0A1A4F] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Count Display */}
      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
        <span>Showing {filteredProducts.length} perfume{filteredProducts.length === 1 ? '' : 's'}</span>
        <span className="text-emerald-700 font-medium flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Cash on Delivery Available</span>
        </span>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <p className="text-sm text-slate-600">No fragrances match your search criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
            }}
            className="btn-gold-outline px-5 py-2 rounded-lg text-xs cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              settings={settings}
              onNavigate={onNavigate}
              onAddToCart={onAddToCart}
              priorityImage={index === 0}
            />
          ))}
        </div>
      )}

      {/* Delivery Banner */}
      <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
        <span className="text-xs font-semibold text-slate-900 block">
          Complimentary Nationwide Delivery
        </span>
        <p className="text-xs text-slate-500 max-w-lg mx-auto font-light">
          All orders are packed securely and dispatched via trusted courier services with doorstep Cash on Delivery across Pakistan.
        </p>
      </div>

    </div>
  );
};
