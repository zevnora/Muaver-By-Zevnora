import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  Search, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  MessageSquare, 
  Sparkles, 
  Filter, 
  User, 
  Calendar,
  Package
} from 'lucide-react';
import { ProductReview, Product } from '../types/store';
import { subscribeAllReviews, deleteProductReview } from '../services/storeService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { AdminConsoleLoader } from './BrandedLoader';

interface AdminReviewsProps {
  products?: Product[];
  onRefresh?: () => void;
}

export const AdminReviews: React.FC<AdminReviewsProps> = ({ products = [], onRefresh }) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  // Delete modal state
  const [reviewToDelete, setReviewToDelete] = useState<ProductReview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Real-time Firestore subscription to all reviews
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllReviews(
      (list) => {
        setReviews(list);
        setLoading(false);
      },
      (err) => {
        console.error('Admin reviews listener error:', err);
        setError('Failed to load reviews in real time.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Compute stats
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
    : '0.0';
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const lowRatingCount = reviews.filter((r) => r.rating <= 2).length;

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Rating filter
      if (ratingFilter !== 'all' && r.rating !== Number(ratingFilter)) {
        return false;
      }
      // Product filter
      if (selectedProductId !== 'all' && r.productId !== selectedProductId) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const prodName = r.productName || products.find((p) => p.id === r.productId)?.name || '';
      return (
        r.customerName?.toLowerCase().includes(q) ||
        r.customerEmail?.toLowerCase().includes(q) ||
        r.reviewText?.toLowerCase().includes(q) ||
        prodName.toLowerCase().includes(q)
      );
    });
  }, [reviews, ratingFilter, selectedProductId, searchQuery, products]);

  // Handle delete execution
  const handleDeleteConfirm = async () => {
    if (!reviewToDelete || !reviewToDelete.id) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteProductReview(reviewToDelete.id);
      // Immediately reflect deletion in local state
      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
      setSuccessNotice(`Review by "${reviewToDelete.customerName}" has been successfully removed.`);
      setReviewToDelete(null);
      setTimeout(() => setSuccessNotice(null), 4000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Delete review error:', err);
      setDeleteError(err.message || 'Failed to delete review. Please check admin permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'Recently';
    const date = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 text-white font-montserrat">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[var(--gold-300)]">
              <Star className="w-5 h-5 fill-current" />
            </span>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-wide">
              Customer Reviews Moderation
            </h2>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Oversee, moderate, and manage patron reviews across all MUAVER perfumes. Live synced with Firestore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--gold-300)] bg-[var(--navy-900)] px-3 py-1.5 rounded-lg border border-[var(--gold-500)]/30">
            {totalReviews} Total Reviews
          </span>
        </div>
      </div>

      {/* Notices */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">Total Reviews</span>
          <div className="text-2xl font-bold text-white font-mono">{totalReviews}</div>
          <p className="text-[10px] text-white/40">Verified customer feedback</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">Average Rating</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--gold-300)] font-mono">{averageRating}</span>
            <span className="text-xs text-white/40">/ 5.0</span>
          </div>
          <div className="flex gap-0.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i <= Math.round(Number(averageRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">5-Star Ratings</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{fiveStarCount}</div>
          <p className="text-[10px] text-emerald-300/60">
            {totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 0}% of all reviews
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">Needs Attention</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">{lowRatingCount}</div>
          <p className="text-[10px] text-rose-300/60">Ratings with 1 or 2 stars</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, fragrance, text..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-[var(--gold-500)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Product Filter */}
          {products.length > 0 && (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="py-2 px-3 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:outline-none focus:border-[var(--gold-500)] cursor-pointer"
            >
              <option value="all">All Fragrances</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as any)}
            className="py-2 px-3 rounded-lg bg-black/30 border border-white/10 text-white text-xs focus:outline-none focus:border-[var(--gold-500)] cursor-pointer"
          >
            <option value="all">All Ratings (1-5★)</option>
            <option value="5">5 Stars only</option>
            <option value="4">4 Stars only</option>
            <option value="3">3 Stars only</option>
            <option value="2">2 Stars only</option>
            <option value="1">1 Star only</option>
          </select>
        </div>
      </div>

      {/* Reviews Table / List */}
      <div className="rounded-xl bg-[var(--navy-900)] border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8">
            <AdminConsoleLoader label="Loading Customer Reviews..." minHeight="min-h-[260px]" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-white/50 space-y-2">
            <Star className="w-8 h-8 mx-auto text-white/20" />
            <p className="text-sm font-semibold text-white/80">No reviews found</p>
            <p className="text-xs text-white/40">
              {reviews.length === 0
                ? 'No customer reviews have been submitted yet.'
                : 'No reviews match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredReviews.map((review) => {
              const matchedProduct = products.find((p) => p.id === review.productId);
              const productName = review.productName || matchedProduct?.name || 'Fragrance Flacon';

              return (
                <div
                  key={review.id}
                  className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Header: Product Name + Customer info */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--gold-500)]/15 text-[var(--gold-300)] border border-[var(--gold-500)]/30">
                        <Package className="w-3 h-3" />
                        <span>{productName}</span>
                      </span>

                      {/* Star Rating */}
                      <div className="flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/25">
                        <div className="flex items-center text-amber-400">
                          {[1, 2, 3, 4, 5].map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={`w-3 h-3 ${starIdx <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-amber-300 font-mono ml-0.5">
                          {review.rating}.0
                        </span>
                      </div>

                      {/* Date */}
                      <span className="text-[11px] text-white/40 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(review.createdAt)}</span>
                      </span>
                    </div>

                    {/* Review text */}
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-light bg-black/20 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
                      "{review.reviewText}"
                    </p>

                    {/* Author Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/50 pt-1">
                      <span className="flex items-center gap-1.5 font-medium text-white/80">
                        <User className="w-3 h-3 text-[var(--gold-300)]" />
                        <span>{review.customerName}</span>
                      </span>

                      {review.customerEmail && (
                        <span className="text-white/40 font-mono">
                          {review.customerEmail}
                        </span>
                      )}

                      <span className="text-[10px] text-white/30 font-mono truncate max-w-xs">
                        UID: {review.customerId}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Delete Button */}
                  <div className="shrink-0 flex items-center md:self-center">
                    <button
                      onClick={() => setReviewToDelete(review)}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:border-rose-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Delete this review permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!reviewToDelete}
        title="Delete Customer Review"
        itemName={reviewToDelete ? `Review by "${reviewToDelete.customerName}"` : 'Review'}
        message="This review will be permanently deleted from Firestore and immediately removed from the live product page."
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => {
          setReviewToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
