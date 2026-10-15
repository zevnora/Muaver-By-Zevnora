import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Send, 
  User, 
  Phone, 
  Mail, 
  ExternalLink, 
  Trash2, 
  Reply, 
  Check, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  Loader2,
  Inbox,
  Crown
} from 'lucide-react';
import { CustomerMessage } from '../types/store';
import { replyToCustomerMessage, markMessageAsRead, deleteCustomerMessage } from '../services/storeService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminMessagesProps {
  messages: CustomerMessage[];
  adminEmail: string;
  onRefresh?: () => void;
}

export const AdminMessages: React.FC<AdminMessagesProps> = ({
  messages,
  adminEmail,
  onRefresh,
}) => {
  // Local optimistic state synced with live props
  const [localMessages, setLocalMessages] = useState<CustomerMessage[]>(messages);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(() => {
    return messages.length > 0 ? (messages[0].id || null) : null;
  });

  // Keep selected message valid if local list changes
  useEffect(() => {
    if (selectedMessageId && !localMessages.some((m) => m.id === selectedMessageId)) {
      setSelectedMessageId(localMessages.length > 0 ? (localMessages[0].id || null) : null);
    }
  }, [localMessages, selectedMessageId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'New' | 'Read' | 'Replied'>('All');
  
  // Reply drafting state
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replySuccessNotice, setReplySuccessNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete message confirmation modal state (replaces unreliable window.confirm)
  const [messageToDelete, setMessageToDelete] = useState<CustomerMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [deleteMessageError, setDeleteMessageError] = useState<string | null>(null);

  // Selected message
  const activeMessage = localMessages.find((m) => m.id === selectedMessageId) || (localMessages.length > 0 ? localMessages[0] : null);

  // Filter & Search
  const filteredMessages = localMessages.filter((m) => {
    if (statusFilter !== 'All' && m.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.customerName?.toLowerCase().includes(q) ||
      m.customerEmail?.toLowerCase().includes(q) ||
      m.customerPhone?.toLowerCase().includes(q) ||
      m.messageText?.toLowerCase().includes(q) ||
      m.orderReference?.toLowerCase().includes(q)
    );
  });

  const handleMarkAsRead = async (messageId: string) => {
    try {
      setActionError(null);
      await markMessageAsRead(messageId);
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'Read' } : m))
      );
    } catch (err: any) {
      console.error('Error marking as read:', err);
      setActionError(err.message || 'Could not mark message as read.');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMessage || !activeMessage.id || !replyText.trim()) return;

    try {
      setIsSubmittingReply(true);
      setActionError(null);
      await replyToCustomerMessage(activeMessage.id, replyText.trim(), adminEmail);
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === activeMessage.id
            ? { ...m, status: 'Replied', adminReply: replyText.trim(), repliedBy: adminEmail.trim() }
            : m
        )
      );
      setReplyText('');
      setReplySuccessNotice('Reply dispatched to patron account successfully.');
      setTimeout(() => setReplySuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Error replying to customer message:', err);
      setActionError(err.message || 'Could not transmit reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !messageToDelete.id) return;
    try {
      setIsDeletingMessage(true);
      setDeleteMessageError(null);
      const targetId = messageToDelete.id;

      // 1. Delete from Firestore collection "messages"
      await deleteCustomerMessage(targetId);

      // 2. Immediately remove from local UI list
      setLocalMessages((prev) => prev.filter((m) => m.id !== targetId));

      // 3. Clear selected if it was the deleted message
      if (selectedMessageId === targetId) {
        const remaining = localMessages.filter((m) => m.id !== targetId);
        setSelectedMessageId(remaining.length > 0 ? (remaining[0].id || null) : null);
      }

      // 4. Close modal and sync
      setMessageToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error deleting message:', err);
      const errMsg = err?.message || String(err);
      setDeleteMessageError(`Firebase Error: ${errMsg}`);
      setActionError(`Could not delete message: ${errMsg}`);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const countNew = localMessages.filter((m) => m.status === 'New').length;
  const countRead = localMessages.filter((m) => m.status === 'Read').length;
  const countReplied = localMessages.filter((m) => m.status === 'Replied').length;

  return (
    <div className="space-y-6 font-montserrat animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-2xl font-bold text-white tracking-wide">
              Customer Concierge Messages
            </h2>
            {countNew > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md">
                {countNew} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-white/60 mt-1">
            Review inquiries, consultations, and order questions from logged-in customers.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/5 text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {replySuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{replySuccessNotice}</span>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#03091D] p-3 rounded-2xl border border-white/10">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'All'
                ? 'bg-[var(--gold-500)] text-[var(--navy-900)] font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            All ({localMessages.length})
          </button>
          <button
            onClick={() => setStatusFilter('New')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'New'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Unread / New ({countNew})
          </button>
          <button
            onClick={() => setStatusFilter('Read')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'Read'
                ? 'bg-blue-500 text-white font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Read ({countRead})
          </button>
          <button
            onClick={() => setStatusFilter('Replied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'Replied'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Replied ({countReplied})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patron, email, ref..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#050F2E] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--gold-500)]"
          />
        </div>
      </div>

      {/* Main Two-Column Inbox Interface */}
      {localMessages.length === 0 ? (
        <div className="text-center py-20 px-4 bg-[#03091D] rounded-2xl border border-white/10 space-y-3">
          <Inbox className="w-12 h-12 text-white/30 mx-auto" />
          <h3 className="font-heading text-lg font-bold text-white">No Customer Messages Yet</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            When patrons send questions or inquiries from their account or the contact page, they will show up here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Messages List (5 Cols) */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 p-4 rounded-xl bg-[#03091D] border border-white/10 text-xs text-white/50">
                No inquiries match your filter criteria.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = activeMessage?.id === msg.id;
                const isNew = msg.status === 'New';
                const isReplied = msg.status === 'Replied';

                const timeStr = msg.createdAt?.seconds
                  ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessageId(msg.id || null);
                      if (msg.status === 'New' && msg.id) {
                        handleMarkAsRead(msg.id);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 relative overflow-hidden group ${
                      isSelected
                        ? 'bg-[#0A1A4F] border-[var(--gold-500)] shadow-lg shadow-amber-950/20'
                        : isNew
                        ? 'bg-[#061238] border-amber-500/40 hover:border-amber-400/60'
                        : 'bg-[#03091D] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isNew && (
                      <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20 animate-pulse" />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-xs font-bold text-white">
                          {msg.customerName}
                        </span>
                        {msg.orderReference && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-[#F0D27A] border border-white/10">
                            {msg.orderReference}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40">{timeStr}</span>
                        {/* Quick Trash Icon on hover/touch */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMessageToDelete(msg);
                            setDeleteMessageError(null);
                          }}
                          className="opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 transition-opacity"
                          title="Delete Message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                      {msg.messageText}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-white/40 truncate max-w-[200px] font-mono">
                        {msg.customerEmail}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isNew
                            ? 'bg-amber-500/20 text-amber-300'
                            : isReplied
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Message Detail & Reply Box (7 Cols) */}
          <div className="lg:col-span-7 bg-[#03091D] border border-white/10 rounded-2xl p-6 space-y-6">
            {activeMessage ? (
              <>
                {/* Header with Customer Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#A67C1A] text-[#050F2E] flex items-center justify-center font-bold text-sm">
                        {(activeMessage.customerName || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-heading text-base font-bold text-white">
                          {activeMessage.customerName}
                        </h3>
                        <p className="text-xs text-white/50 font-mono">
                          Customer UID: {activeMessage.customerId?.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {activeMessage.status === 'New' && activeMessage.id && (
                      <button
                        onClick={() => handleMarkAsRead(activeMessage.id!)}
                        className="px-3 py-1.5 rounded-xl border border-white/20 text-xs text-white hover:bg-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                        <span>Mark Read</span>
                      </button>
                    )}
                    {activeMessage.id && (
                      <button
                        onClick={() => {
                          setMessageToDelete(activeMessage);
                          setDeleteMessageError(null);
                        }}
                        className="p-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/50 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Delete Inquiry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact Quick Channels Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#050F2E] p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[var(--gold-300)] shrink-0" />
                    <a
                      href={`mailto:${activeMessage.customerEmail}`}
                      className="text-white hover:underline truncate"
                    >
                      {activeMessage.customerEmail}
                    </a>
                  </div>
                  {activeMessage.customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                      <a
                        href={`https://wa.me/${activeMessage.customerPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:underline truncate font-mono"
                      >
                        {activeMessage.customerPhone} (WhatsApp)
                      </a>
                    </div>
                  )}
                  {activeMessage.orderReference && (
                    <div className="sm:col-span-2 flex items-center gap-2 pt-1 border-t border-white/5">
                      <span className="text-white/40">Linked Order:</span>
                      <span className="font-mono text-[var(--gold-300)] font-bold">
                        {activeMessage.orderReference}
                      </span>
                    </div>
                  )}
                </div>

                {/* The Customer's Message */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold block">
                    Message from Patron
                  </span>
                  <div className="p-4 rounded-xl bg-[#050F2E] border border-white/10 text-xs text-[#F8F4E8] leading-relaxed whitespace-pre-wrap">
                    {activeMessage.messageText}
                  </div>
                </div>

                {/* Existing Admin Reply If Present */}
                {activeMessage.adminReply && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-[#F0D27A] font-bold flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Dispatched Store Reply</span>
                      </span>
                      <span className="text-[10px] text-white/40">
                        By {activeMessage.repliedBy || 'Maison Concierge'}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#0A1A4F] to-[#081438] border border-[#D4AF37]/50 text-xs text-[#F8F4E8] leading-relaxed whitespace-pre-wrap">
                      {activeMessage.adminReply}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-[var(--gold-300)] font-bold flex items-center gap-1.5">
                      <Reply className="w-3.5 h-3.5" />
                      <span>{activeMessage.adminReply ? 'Send Updated Reply' : 'Reply to Patron'}</span>
                    </label>
                    <span className="text-[10px] text-white/40">
                      Instantly appears in patron's "My Account" area
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    placeholder={`Dear ${activeMessage.customerName},\nThank you for contacting MUAVER. `}
                    className="w-full bg-[#050F2E] border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--gold-500)] leading-relaxed"
                  />

                  {/* Quick canned replies */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-white/40 self-center mr-1">Quick text:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyText(
                          `Dear ${activeMessage.customerName},\nThank you for reaching out. We have confirmed your order details and our fulfillment team in Karachi has dispatched your parcel via express courier with inspection seals.`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/70 border border-white/10"
                    >
                      Dispatched
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyText(
                          `Dear ${activeMessage.customerName},\nThank you for your inquiry. All MUAVER fragrances are crafted with 35% pure perfume oil concentration for all-day projection and come with nationwide Cash on Delivery.`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/70 border border-white/10"
                    >
                      Oil Concentration Info
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyText(
                          `Dear ${activeMessage.customerName},\nOur team has received your inquiry and a customer care advisor will contact your registered phone number shortly.`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/70 border border-white/10"
                    >
                      Follow-up Call
                    </button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingReply || !replyText.trim()}
                      className="btn-gold-primary px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
                    >
                      {isSubmittingReply ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isSubmittingReply ? 'Dispatching...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-24 space-y-2 text-white/50 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto text-white/20" />
                <p>Select a message from the list to read details and reply.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Robust Delete Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDeleteModal
        isOpen={Boolean(messageToDelete)}
        title="Delete Customer Message"
        itemName={messageToDelete ? `Message from ${messageToDelete.customerName}` : 'Message'}
        message="Are you sure you want to permanently remove this customer message from Firestore? This cannot be undone."
        isDeleting={isDeletingMessage}
        errorMessage={deleteMessageError}
        onConfirm={confirmDeleteMessage}
        onCancel={() => {
          if (!isDeletingMessage) {
            setMessageToDelete(null);
            setDeleteMessageError(null);
          }
        }}
      />
    </div>
  );
};
