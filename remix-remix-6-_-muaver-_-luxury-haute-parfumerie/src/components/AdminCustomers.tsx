import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  ExternalLink, 
  MessageCircle, 
  RefreshCw, 
  Loader2, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { CustomerProfile, Order } from '../types/store';
import { subscribeCustomers, getCustomers } from '../services/storeService';

interface AdminCustomersProps {
  orders: Order[];
  onRefresh?: () => void;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  orders,
  onRefresh,
}) => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'All' | 'WithOrders' | 'NoOrders'>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  // Live subscription to customers collection in Firestore
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCustomers(
      (liveCustomers) => {
        setCustomers(liveCustomers);
        setLoading(false);
        setError(null);
      },
      (err: any) => {
        console.error('Error in live customers subscription:', err);
        setError(err?.message || 'Failed to connect to customers directory.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const list = await getCustomers();
      setCustomers(list);
      setError(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh customers directory.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to normalize phone numbers for matching
  const cleanPhoneStr = (p?: string) => (p ? p.replace(/\D/g, '') : '');

  // Calculate order count for each customer
  const customerOrdersMap = useMemo(() => {
    const map = new Map<string, Order[]>();
    customers.forEach((c) => {
      const matched = orders.filter((o) => {
        if (o.customerId && o.customerId === c.uid) return true;
        if (c.email && o.customer?.email && o.customer.email.toLowerCase() === c.email.toLowerCase()) return true;
        const cPhone = cleanPhoneStr(c.phone);
        const oPhone = cleanPhoneStr(o.customer?.phone);
        if (cPhone && oPhone && (cPhone === oPhone || cPhone.endsWith(oPhone) || oPhone.endsWith(cPhone))) return true;
        return false;
      });
      map.set(c.uid, matched);
    });
    return map;
  }, [customers, orders]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      // Search matching (Name, Email, Phone, City)
      const matchesSearch =
        !q ||
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const customerOrders = customerOrdersMap.get(c.uid) || [];
      if (orderFilter === 'WithOrders') return customerOrders.length > 0;
      if (orderFilter === 'NoOrders') return customerOrders.length === 0;

      return true;
    });
  }, [customers, searchQuery, orderFilter, customerOrdersMap]);

  // Metrics
  const totalCustomersCount = customers.length;
  const customersWithOrdersCount = useMemo(() => {
    return customers.filter((c) => (customerOrdersMap.get(c.uid) || []).length > 0).length;
  }, [customers, customerOrdersMap]);

  const totalOrdersFromCustomers = useMemo(() => {
    let count = 0;
    customerOrdersMap.forEach((matched) => {
      count += matched.length;
    });
    return count;
  }, [customerOrdersMap]);

  // Format signup timestamp
  const formatSignupDate = (rawDate: any): string => {
    if (!rawDate) return 'Recently';
    let date: Date;
    if (rawDate?.seconds) {
      date = new Date(rawDate.seconds * 1000);
    } else if (rawDate instanceof Date) {
      date = rawDate;
    } else {
      date = new Date(rawDate);
    }
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const selectedOrders = selectedCustomer ? (customerOrdersMap.get(selectedCustomer.uid) || []) : [];

  return (
    <div className="space-y-6 font-montserrat animate-fade-in text-white/90">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[var(--gold-300)]">
            <Users className="w-4 h-4 text-[var(--gold-300)]" />
            <span>Storefront Patron Registry</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white">
            Customer Accounts
          </h2>
          <p className="text-xs text-white/60">
            Registered customer accounts in the MUAVER luxury clientele directory.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="btn-gold-outline px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 self-start sm:self-auto hover:bg-[var(--gold-500)]/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0A1A4F]/60 backdrop-blur-md border border-white/10 rounded-xl p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-[var(--gold-300)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalCustomersCount}
          </div>
          <div className="text-[11px] text-white/40">
            Client accounts created via website
          </div>
        </div>

        <div className="bg-[#0A1A4F]/60 backdrop-blur-md border border-white/10 rounded-xl p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Active Buyers</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {customersWithOrdersCount}
          </div>
          <div className="text-[11px] text-white/40">
            Customers who have placed orders
          </div>
        </div>

        <div className="bg-[#0A1A4F]/60 backdrop-blur-md border border-white/10 rounded-xl p-4.5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Client Orders</span>
            <TrendingUp className="w-4 h-4 text-[var(--gold-300)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalOrdersFromCustomers}
          </div>
          <div className="text-[11px] text-white/40">
            Total orders linked to customer profiles
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0A1A4F]/40 border border-white/10 p-3.5 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, email, phone, city..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/40 text-xs focus:border-[var(--gold-500)] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setOrderFilter('All')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              orderFilter === 'All'
                ? 'bg-[var(--gold-500)] text-[#0A1A4F] font-bold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setOrderFilter('WithOrders')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              orderFilter === 'WithOrders'
                ? 'bg-[var(--gold-500)] text-[#0A1A4F] font-bold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            With Orders ({customersWithOrdersCount})
          </button>
          <button
            onClick={() => setOrderFilter('NoOrders')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              orderFilter === 'NoOrders'
                ? 'bg-[var(--gold-500)] text-[#0A1A4F] font-bold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            New Registered ({customers.length - customersWithOrdersCount})
          </button>
        </div>
      </div>

      {/* Error notification if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Table Container */}
      <div className="bg-[#0A1A4F]/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading && customers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-7 h-7 text-[var(--gold-300)] animate-spin mx-auto" />
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--gold-300)]">
              Loading Customer Directory...
            </p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-white/20 mx-auto" />
            <h4 className="font-heading text-sm font-semibold text-white">
              {searchQuery ? 'No matching customers found' : 'No registered customers yet'}
            </h4>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              {searchQuery
                ? `No customers match your search query "${searchQuery}". Try a different keyword.`
                : 'Customers who create an account or sign up on the storefront will appear here live.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase font-mono tracking-widest text-[var(--gold-300)] bg-white/5">
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">City / Location</th>
                  <th className="p-3.5">Signup Date</th>
                  <th className="p-3.5 text-center">Orders Placed</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredCustomers.map((cust) => {
                  const custOrders = customerOrdersMap.get(cust.uid) || [];
                  const rawPhone = cust.phone ? cust.phone.replace(/\D/g, '') : '';
                  const waUrl = rawPhone
                    ? `https://wa.me/${rawPhone.startsWith('92') ? rawPhone : (rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : '92' + rawPhone)}`
                    : null;

                  return (
                    <tr
                      key={cust.uid || cust.id}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCustomer(cust)}
                    >
                      {/* Name & Initial Avatar */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--gold-500)]/20 border border-[var(--gold-500)]/40 flex items-center justify-center font-bold text-xs text-[var(--gold-300)] shrink-0">
                            {cust.fullName ? cust.fullName.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{cust.fullName || 'Valued Patron'}</span>
                            </div>
                            <span className="text-[10px] text-white/40 font-mono block">
                              UID: {cust.uid ? cust.uid.slice(0, 10) + '...' : '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {cust.phone ? (
                            <div className="flex items-center gap-1.5 text-white/90 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-[var(--gold-300)]" />
                              <span>{cust.phone}</span>
                            </div>
                          ) : (
                            <span className="text-white/40 italic text-[11px]">No phone</span>
                          )}
                          <div className="flex items-center gap-1.5 text-white/60 text-[11px]">
                            <Mail className="w-3 h-3 text-white/40" />
                            <span>{cust.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* City & Address */}
                      <td className="p-3.5">
                        {cust.city ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-medium text-white text-[11px]">
                              <MapPin className="w-3 h-3 text-[var(--gold-300)]" />
                              <span>{cust.city}</span>
                            </div>
                            {cust.address && (
                              <div className="text-[10px] text-white/50 truncate max-w-[180px]">
                                {cust.address}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/40 italic">—</span>
                        )}
                      </td>

                      {/* Signup Date */}
                      <td className="p-3.5 text-white/60 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-white/40" />
                          <span>{formatSignupDate(cust.createdAt)}</span>
                        </div>
                      </td>

                      {/* Orders Count Badge */}
                      <td className="p-3.5 text-center">
                        {custOrders.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono">
                            <ShoppingBag className="w-3 h-3" />
                            <span>{custOrders.length} {custOrders.length === 1 ? 'Order' : 'Orders'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-white/40 bg-white/5 border border-white/5 font-mono">
                            0 Orders
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat with Customer on WhatsApp"
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            title="View Customer Profile & Orders"
                            className="px-2.5 py-1 rounded-md text-[10px] font-semibold border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050F2E]/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#081438] border border-[var(--gold-500)]/40 rounded-2xl shadow-2xl overflow-hidden text-white space-y-0">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0A1A4F]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--gold-500)]/20 border border-[var(--gold-500)]/40 flex items-center justify-center font-bold text-sm text-[var(--gold-300)]">
                  {selectedCustomer.fullName ? selectedCustomer.fullName.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-white">
                    {selectedCustomer.fullName || 'Valued Patron'}
                  </h3>
                  <p className="text-xs text-white/50 font-mono">
                    Registered: {formatSignupDate(selectedCustomer.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Contact & Address Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl border border-white/10 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-1">
                    Email Address
                  </span>
                  <div className="flex items-center gap-2 text-white">
                    <Mail className="w-3.5 h-3.5 text-[var(--gold-300)] shrink-0" />
                    <span className="break-all">{selectedCustomer.email}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-1">
                    Phone / WhatsApp
                  </span>
                  <div className="flex items-center gap-2 text-white font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{selectedCustomer.phone || 'Not provided'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-1">
                    City
                  </span>
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-3.5 h-3.5 text-[var(--gold-300)] shrink-0" />
                    <span>{selectedCustomer.city || 'Not provided'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-1">
                    Shipping Address
                  </span>
                  <div className="text-white text-xs">
                    {selectedCustomer.address || 'Not provided'}
                  </div>
                </div>
              </div>

              {/* Order History for this customer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--gold-300)] flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order History ({selectedOrders.length})</span>
                  </h4>
                  {selectedCustomer.phone && (
                    <a
                      href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Customer</span>
                    </a>
                  )}
                </div>

                {selectedOrders.length === 0 ? (
                  <div className="p-6 text-center bg-white/5 rounded-xl border border-white/5 text-xs text-white/50">
                    This customer has not placed any orders yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrders.map((ord) => (
                      <div
                        key={ord.id || ord.orderNumber}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">
                              #{ord.orderNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              ord.status === 'Delivered'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : ord.status === 'Cancelled'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50 font-mono block mt-0.5">
                            {formatSignupDate(ord.createdAt)} • {ord.items?.length || 1} items
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-[var(--gold-300)] text-sm">
                            Rs. {(ord.totalAmount || 0).toLocaleString()}
                          </div>
                          <span className="text-[10px] text-white/40 uppercase font-mono">
                            {ord.paymentMethod || 'Cash on Delivery'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0A1A4F] border-t border-white/10 flex items-center justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="btn-gold-outline px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
