import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShoppingBag, 
  MessageCircle, 
  Printer, 
  Download, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  Eye, 
  ChevronRight, 
  Clock, 
  Truck, 
  DollarSign, 
  FileText, 
  Filter, 
  Send, 
  ArrowLeft,
  Crown,
  AlertCircle,
  Sparkles,
  Pencil
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Order, OrderStatus, SiteSettings, PaymentStatus } from '../types/store';
import { updateOrderStatus, deleteOrder, createOrder, updateOrderPaymentStatus } from '../services/storeService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminOrdersProps {
  orders: Order[];
  settings: SiteSettings;
  onRefresh: () => Promise<void>;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ orders, settings, onRefresh }) => {
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'All' | 'today' | '7days' | '30days'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // In-app Delete Confirmation Modal State
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [deleteOrderError, setDeleteOrderError] = useState<string | null>(null);

  // In-app Printable Slip Modal & Editable Fees
  const [printPreviewOrder, setPrintPreviewOrder] = useState<Order | null>(null);
  const [slipHandlingFee, setSlipHandlingFee] = useState<number>(0);
  const [slipShippingFee, setSlipShippingFee] = useState<number>(0);
  const [isEditingHandling, setIsEditingHandling] = useState<boolean>(false);
  const [isEditingShipping, setIsEditingShipping] = useState<boolean>(false);

  // Sync localOrders with prop changes
  React.useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const statusOptions: OrderStatus[] = [
    'Pending',
    'Confirmed',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Returned',
  ];

  // Format date helper
  const formatOrderDate = (dateVal: any) => {
    if (!dateVal) return 'Recently';
    const date = dateVal?.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtered orders list (using localOrders for immediate optimistic UI updates)
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    return localOrders.filter((o) => {
      // Status filter
      if (selectedStatus !== 'All' && o.status !== selectedStatus) return false;

      // Date filter
      if (dateFilter !== 'All') {
        const orderTime = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : new Date(o.createdAt || 0).getTime();
        const diffMs = now - orderTime;
        if (dateFilter === 'today' && diffMs > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '7days' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30days' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNum = o.orderNumber?.toLowerCase().includes(q);
        const matchesName = o.customer?.fullName?.toLowerCase().includes(q);
        const matchesPhone = o.customer?.phone?.includes(q);
        const matchesCity = o.customer?.city?.toLowerCase().includes(q);
        return matchesNum || matchesName || matchesPhone || matchesCity;
      }

      return true;
    });
  }, [localOrders, selectedStatus, dateFilter, searchTerm]);

  // Handle status update
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setLoadingAction(true);
      await updateOrderStatus(orderId, newStatus);
      await onRefresh();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showStatus(`Order status updated to "${newStatus}"`, 'success');
    } catch (err: any) {
      showStatus(err.message || 'Failed to update status', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle saving admin internal note
  const handleSaveAdminNote = async () => {
    if (!selectedOrder?.id) return;
    try {
      setLoadingAction(true);
      await updateOrderStatus(selectedOrder.id, selectedOrder.status, adminNoteInput);
      await onRefresh();
      setSelectedOrder((prev) => (prev ? { ...prev, adminNotes: adminNoteInput } : null));
      showStatus('Admin note saved', 'success');
    } catch (err: any) {
      showStatus(err.message || 'Failed to save note', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Trigger delete order confirmation dialog (replaces window.confirm)
  const handleDeleteOrder = (order: Order) => {
    setOrderToDelete(order);
    setDeleteOrderError(null);
  };

  // Confirm delete order with immediate optimistic UI update
  const confirmDeleteOrder = async () => {
    if (!orderToDelete || !orderToDelete.id) return;
    try {
      setIsDeletingOrder(true);
      setDeleteOrderError(null);
      const targetId = orderToDelete.id;
      const targetNum = orderToDelete.orderNumber;

      // 1. Delete document from Firestore
      await deleteOrder(targetId);

      // 2. Immediately remove from local list
      setLocalOrders((prev) => prev.filter((o) => o.id !== targetId));

      // 3. Close details if currently open
      if (selectedOrder?.id === targetId) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);

      // 4. Re-fetch
      if (onRefresh) await onRefresh();
      showStatus(`Order ${targetNum} permanently deleted`, 'success');
    } catch (err: any) {
      console.error('Delete order failed:', err);
      const errMsg = err?.message || String(err);
      setDeleteOrderError(`Delete failed: ${errMsg}`);
      showStatus(`Delete failed: ${errMsg}`, 'error');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Open WhatsApp to message the customer
  const handleMessageCustomerOnWhatsApp = (order: Order) => {
    const rawPhone = order.customer.phone.replace(/\D/g, '');
    let fullPhone = rawPhone;
    if (fullPhone.startsWith('0')) {
      fullPhone = '92' + fullPhone.slice(1);
    } else if (!fullPhone.startsWith('92')) {
      fullPhone = '92' + fullPhone;
    }

    const itemsSummary = (order.items || [])
      .map((item) => `• ${item.productName} (${item.size}) x${item.quantity}`)
      .join('\n');

    const message = [
      `Assalam-o-Alaikum ${order.customer.fullName},`,
      `This is MUAVER Haute Parfumerie regarding your order *${order.orderNumber}*.`,
      ``,
      `Order Details:`,
      itemsSummary,
      `Total: Rs. ${order.totalAmount.toLocaleString()} (Cash on Delivery)`,
      `Shipping Address: ${order.customer.address}, ${order.customer.city}`,
      ``,
      `Current Status: *${order.status}*`,
      ``,
      `If you have any questions or delivery instructions, please let us know!`,
      `MUAVER Royale Concierge`
    ].join('\n');

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Open invoice / shipping slip with editable fees
  const handlePrintSlip = (order: Order) => {
    setPrintPreviewOrder(order);
    const initialHandling =
      order.handlingFee !== undefined
        ? Number(order.handlingFee)
        : Number(settings.deliverySettings?.handlingCharges ?? 0);
    const initialShipping = Number(
      order.shippingFee !== undefined
        ? order.shippingFee
        : (settings.deliverySettings?.deliveryCharges ?? 0)
    );
    setSlipHandlingFee(initialHandling);
    setSlipShippingFee(initialShipping);
    setIsEditingHandling(false);
    setIsEditingShipping(false);
  };

  // Generate complete standalone printable HTML document for the invoice
  const generateStandaloneInvoiceHtml = (
    order: Order,
    fees: { handling: number; shipping: number; subtotal: number; total: number },
    storeSettings: SiteSettings
  ): string => {
    const rawLogo = storeSettings.landscapeLogoUrl || 'https://i.ibb.co/8n6t1tQH/Untitled-design.png';
    const logoUrl = rawLogo.startsWith('http') ? rawLogo : 'https://i.ibb.co/8n6t1tQH/Untitled-design.png';

    const isOnline = order.paymentMethod === 'online';
    const isPaid = order.paymentStatus === 'Payment Verified';
    const slipTitle = isOnline ? 'OFFICIAL INVOICE' : 'CASH ON DELIVERY SLIP';

    const customerName = order.customer?.fullName || 'Valued Customer';
    const customerPhone = order.customer?.phone || '';
    const customerEmail = order.customer?.email || '';
    const customerAddress = order.customer?.address || '';
    const customerCity = order.customer?.city || '';
    const customerNotes = order.customer?.notes || '';

    const paymentModeText = isOnline
      ? 'Online Transfer (Bank/Wallet)'
      : (order.paymentMethod || 'Cash on Delivery (COD)');

    const paymentStatusHtml = isOnline
      ? (isPaid
          ? '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-weight:700;font-size:10px;text-transform:uppercase;">PAID</span>'
          : '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-weight:700;font-size:10px;text-transform:uppercase;">PAYMENT PENDING</span>')
      : `<span style="font-weight:600;color:#0f172a;">${order.paymentStatus || 'COD'}</span>`;

    const badgeHeaderHtml = isOnline
      ? (isPaid
          ? '<div style="margin-top:6px;"><span style="display:inline-block;padding:3px 10px;border-radius:4px;background:#dcfce7;border:2px solid #16a34a;color:#14532d;font-weight:900;font-size:11px;letter-spacing:1px;text-transform:uppercase;">PAID</span></div>'
          : '<div style="margin-top:6px;"><span style="display:inline-block;padding:3px 10px;border-radius:4px;background:#fef3c7;border:2px solid #d97706;color:#78350f;font-weight:900;font-size:10px;letter-spacing:1px;text-transform:uppercase;">PAYMENT PENDING</span></div>')
      : '';

    const itemsRows = (order.items || []).map((item) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">
          <strong style="color:#0f172a;display:block;">${item.productName}</strong>
          <span style="font-size:9.5px;color:#64748b;">Volume: ${item.size}</span>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;color:#334155;">
          Rs. ${Number(item.price).toLocaleString()}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:#0f172a;">
          ${item.quantity}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:600;color:#0f172a;">
          Rs. ${(Number(item.price) * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${order.orderNumber} | MUAVER</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print, .top-bar {
        display: none !important;
      }
      .invoice-wrapper {
        border: none !important;
        box-shadow: none !important;
        margin: 0 auto !important;
        padding: 0 !important;
        max-width: 190mm !important;
        width: 100% !important;
      }
    }
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0A1A4F;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }
    .top-bar-title {
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    .top-bar-actions {
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #D4AF37;
      color: #0A1A4F;
      border: none;
      padding: 7px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: background 0.15s ease;
    }
    .btn-print:hover {
      background: #e6c555;
    }
    .btn-close {
      background: rgba(255,255,255,0.12);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.25);
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-close:hover {
      background: rgba(255,255,255,0.2);
    }
    .invoice-wrapper {
      position: static;
      transform: none;
      width: 100%;
      max-width: 190mm;
      margin: 16px auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.04);
      overflow: visible;
      height: auto;
    }
    .header-layout {
      display: table;
      width: 100%;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .header-left {
      display: table-cell;
      vertical-align: top;
      width: 55%;
    }
    .header-right {
      display: table-cell;
      vertical-align: top;
      width: 45%;
      text-align: right;
    }
    .logo-img {
      width: 130px;
      max-width: 130px;
      height: auto;
      display: block;
      object-fit: contain;
    }
    .brand-sub {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #B89025;
      font-weight: 700;
      margin-top: 4px;
    }
    .invoice-title {
      font-size: 15px;
      font-weight: 800;
      color: #0A1A4F;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
    }
    .order-num {
      font-size: 12px;
      font-family: monospace;
      font-weight: 700;
      color: #0A1A4F;
    }
    .meta-muted {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .details-row {
      display: table;
      width: 100%;
      margin-bottom: 12px;
    }
    .details-col {
      display: table-cell;
      width: 49%;
      vertical-align: top;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .details-spacer {
      display: table-cell;
      width: 2%;
    }
    .col-title {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 700;
      color: #B89025;
      margin-bottom: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .items-table th {
      background: #0A1A4F !important;
      color: #F8F4E8 !important;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 8px;
      font-weight: 700;
      border: none;
    }
    .items-table td {
      font-size: 10.5px;
    }
    .totals-area {
      display: table;
      width: 100%;
      page-break-inside: avoid;
      margin-bottom: 12px;
    }
    .totals-box {
      float: right;
      width: 250px;
      border-top: 2px solid #D4AF37;
      padding-top: 8px;
    }
    .totals-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 10.5px;
      color: #475569;
    }
    .totals-line.final {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 4px;
      font-weight: 800;
      color: #0A1A4F;
      font-size: 13px;
    }
    .footer-section {
      clear: both;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      text-align: center;
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="top-bar no-print">
    <div class="top-bar-title">MUAVER Invoice - ${order.orderNumber}</div>
    <div class="top-bar-actions">
      <button type="button" class="btn-print" onclick="window.print()">Print / Save as PDF</button>
      <button type="button" class="btn-close" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="invoice-wrapper">
    <!-- Header -->
    <div class="header-layout">
      <div class="header-left">
        <img id="invoice-logo" class="logo-img" src="${logoUrl}" alt="MUAVER">
        <div class="brand-sub">Crafted for Distinction By Ashar Ul Haq Siddiqui</div>
      </div>
      <div class="header-right">
        <div class="invoice-title">${slipTitle}</div>
        <div class="order-num">Order #: ${order.orderNumber}</div>
        <div class="meta-muted">Date: ${formatOrderDate(order.createdAt)}</div>
        <div class="meta-muted">Central Depot: Karachi Distribution Hub</div>
        ${badgeHeaderHtml}
      </div>
    </div>

    <!-- Customer and Dispatch Details -->
    <div class="details-row">
      <div class="details-col">
        <div class="col-title">Consignee & Delivery Address</div>
        <div style="font-weight:700;font-size:12px;color:#0f172a;">${customerName}</div>
        <div style="font-family:monospace;color:#334155;margin-top:2px;">${customerPhone}</div>
        ${customerEmail ? `<div style="font-size:10px;color:#64748b;">${customerEmail}</div>` : ''}
        <div style="color:#334155;margin-top:3px;line-height:1.35;">
          ${customerAddress}, <strong style="color:#0f172a;">${customerCity}</strong>
        </div>
        ${customerNotes ? `<div style="font-style:italic;font-size:10px;color:#64748b;margin-top:4px;padding-top:3px;border-top:1px solid #e2e8f0;">Delivery Note: ${customerNotes}</div>` : ''}
      </div>
      <div class="details-spacer"></div>
      <div class="details-col">
        <div class="col-title">Shipment & Payment Specifications</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:#64748b;">Payment Mode:</span>
          <strong style="color:#0f172a;">${paymentModeText}</strong>
        </div>
        ${isOnline ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span style="color:#64748b;">Payment Status:</span>
          ${paymentStatusHtml}
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:#64748b;">Order Status:</span>
          <strong style="color:#0f172a;">${order.status}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:#64748b;">Inspection:</span>
          <span style="color:#15803d;font-weight:600;">Open & Inspect at Doorstep</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;">Seal Security:</span>
          <span style="color:#334155;font-weight:600;">Tamper-Proof Hologram Verified</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align:left;">Item & Specification</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Totals Section -->
    <div class="totals-area">
      <div class="totals-box">
        <div class="totals-line">
          <span>Subtotal:</span>
          <span style="font-family:monospace;font-weight:600;color:#0f172a;">Rs. ${fees.subtotal.toLocaleString()}</span>
        </div>
        <div class="totals-line">
          <span>Handling Charges:</span>
          <span style="font-family:monospace;color:#0f172a;">${fees.handling === 0 ? 'FREE (Rs. 0)' : 'Rs. ' + fees.handling.toLocaleString()}</span>
        </div>
        <div class="totals-line">
          <span>Delivery Charges:</span>
          <span style="font-family:monospace;color:${fees.shipping === 0 ? '#16a34a;font-weight:700;' : '#0f172a;'}">${fees.shipping === 0 ? 'FREE (Rs. 0)' : 'Rs. ' + fees.shipping.toLocaleString()}</span>
        </div>
        <div class="totals-line final">
          <span style="text-transform:uppercase;font-size:11px;">Total Payable:</span>
          <span style="font-family:monospace;font-size:14px;color:#0A1A4F;">Rs. ${fees.total.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <!-- Professional Footer -->
    <div class="footer-section">
      <p style="margin:2px 0;font-weight:600;color:#334155;">
        Thank you for shopping with MUAVER • Crafted for Distinction by Ashar Ul Haq Siddiqui
      </p>
      <p style="margin:2px 0;font-size:9px;color:#64748b;">
        Customer Care WhatsApp: ${storeSettings.whatsappNumber || '+92 324 2404984'} • Email: ${storeSettings.contactEmail || 'hellomuaver@gmail.com'}
      </p>
      <p style="margin:2px 0;font-size:8.5px;color:#94a3b8;font-style:italic;">
        * Please inspect tamper-evident sealed flacon packaging before tendering payment to courier personnel.
      </p>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      var img = document.getElementById('invoice-logo');
      function triggerPrint() {
        setTimeout(function() {
          try {
            window.focus();
            window.print();
          } catch(e) {
            console.warn('Auto print trigger note:', e);
          }
        }, 200);
      }
      if (img) {
        if (img.complete) {
          triggerPrint();
        } else {
          img.onload = img.onerror = triggerPrint;
        }
      } else {
        triggerPrint();
      }
    });
  </script>
</body>
</html>`;
  };

  // Trigger standalone window print dialog for the invoice
  const handleTriggerPrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!printPreviewOrder) return;

    setIsEditingHandling(false);
    setIsEditingShipping(false);

    const subtotal = Number(printPreviewOrder.subtotal || 0);
    const handling = Number(slipHandlingFee || 0);
    const shipping = Number(slipShippingFee || 0);
    const total = subtotal + handling + shipping;

    const invoiceHtml = generateStandaloneInvoiceHtml(
      printPreviewOrder,
      { handling, shipping, subtotal, total },
      settings
    );

    let popupBlocked = false;
    let printWindow: Window | null = null;

    try {
      // Call window.open directly in click handler turn so browser popup blockers allow it
      printWindow = window.open('', '_blank');
      if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
        popupBlocked = true;
      } else {
        printWindow.document.open();
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
      }
    } catch (err) {
      console.warn('Direct popup window open note:', err);
      popupBlocked = true;
    }

    if (popupBlocked || !printWindow) {
      // Fallback: print through a hidden iframe containing the same standalone invoice HTML
      try {
        let iframe = document.getElementById('muaver-standalone-print-frame') as HTMLIFrameElement;
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'muaver-standalone-print-frame';
          iframe.style.position = 'fixed';
          iframe.style.top = '-9999px';
          iframe.style.left = '-9999px';
          iframe.style.width = '1px';
          iframe.style.height = '1px';
          iframe.style.border = '0';
          document.body.appendChild(iframe);
        }
        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(invoiceHtml);
          iframeDoc.close();
          iframe.contentWindow?.focus();
          setTimeout(() => {
            iframe.contentWindow?.print();
          }, 400);
        }
        showStatus('Notice: Browser blocked the invoice tab popup. Printing via embedded frame. Please allow popups for MUAVER Admin.', 'error');
      } catch (fallbackErr) {
        console.error('Iframe print fallback error:', fallbackErr);
        showStatus('Unable to open print preview. Please check browser popup permissions.', 'error');
      }
    }
  };

  // Save per-order fee overrides without modifying global store settings
  const handleSaveOrderFeeOverrides = async (newHandling: number, newShipping: number) => {
    if (!printPreviewOrder) return;
    const subtotal = Number(printPreviewOrder.subtotal || 0);
    const newTotal = subtotal + newHandling + newShipping;

    const updatedOrder: Order = {
      ...printPreviewOrder,
      handlingFee: newHandling,
      shippingFee: newShipping,
      totalAmount: newTotal,
    };
    setPrintPreviewOrder(updatedOrder);

    // Optimistically update localOrders
    setLocalOrders((prev) =>
      prev.map((o) => (o.id && o.id === updatedOrder.id ? updatedOrder : o))
    );
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }

    // Persist to Firestore order document if it has an ID
    if (updatedOrder.id) {
      try {
        const orderRef = doc(db, 'orders', updatedOrder.id);
        await updateDoc(orderRef, {
          handlingFee: newHandling,
          shippingFee: newShipping,
          totalAmount: newTotal,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Could not persist fee overrides to Firestore order document:', err);
      }
    }
  };

  // Export orders to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      showStatus('No orders available to export.', 'error');
      return;
    }

    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Phone',
      'City',
      'Address',
      'Payment Method',
      'Payment Status',
      'Status',
      'Subtotal (PKR)',
      'Total (PKR)',
      'Items Summary',
      'Admin Notes',
    ];

    const rows = filteredOrders.map((o) => {
      const itemsStr = (o.items || [])
        .map((it) => `${it.productName} (${it.size}) x${it.quantity}`)
        .join('; ');

      const payStatus = o.paymentStatus || (o.paymentMethod === 'online' ? 'Awaiting Payment' : 'COD');

      return [
        `"${o.orderNumber || ''}"`,
        `"${formatOrderDate(o.createdAt)}"`,
        `"${(o.customer?.fullName || '').replace(/"/g, '""')}"`,
        `"${(o.customer?.phone || '').replace(/"/g, '""')}"`,
        `"${(o.customer?.city || '').replace(/"/g, '""')}"`,
        `"${(o.customer?.address || '').replace(/"/g, '""')}"`,
        `"${o.paymentMethod || 'Cash on Delivery'}"`,
        `"${payStatus}"`,
        `"${o.status || 'Pending'}"`,
        o.subtotal || 0,
        o.totalAmount || 0,
        `"${itemsStr.replace(/"/g, '""')}"`,
        `"${(o.adminNotes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MUAVER_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-blue-950/70 text-blue-300 border-blue-500/40';
      case 'Shipped':
        return 'bg-purple-950/70 text-purple-300 border-purple-500/40';
      case 'Delivered':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
      case 'Cancelled':
        return 'bg-rose-950/70 text-rose-300 border-rose-500/40';
      case 'Returned':
        return 'bg-zinc-800 text-zinc-300 border-zinc-600';
      case 'Pending':
      default:
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
    }
  };

  // Payment Badge Helper (COD, Awaiting Payment, Payment Verified, Payment Rejected)
  const renderPaymentBadge = (order: Order) => {
    const rawStatus = order.paymentStatus || (
      order.paymentMethod === 'online' ? 'Awaiting Payment' : 'COD'
    );

    switch (rawStatus) {
      case 'Payment Verified':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 whitespace-nowrap inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Payment Verified</span>
          </span>
        );
      case 'Payment Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/35 text-rose-300 whitespace-nowrap inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Payment Rejected</span>
          </span>
        );
      case 'Awaiting Payment':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/35 text-amber-300 whitespace-nowrap inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Awaiting Payment</span>
          </span>
        );
      case 'COD':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300 whitespace-nowrap inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>COD</span>
          </span>
        );
    }
  };

  // Update order's paymentStatus field only
  const handleUpdatePaymentStatus = async (orderId: string, newPayStatus: PaymentStatus) => {
    try {
      setLoadingAction(true);
      await updateOrderPaymentStatus(orderId, newPayStatus);
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: newPayStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: newPayStatus });
      }
      await onRefresh();
      showStatus(`Payment status set to "${newPayStatus}"!`, 'success');
    } catch (err: any) {
      console.error('Error updating payment status:', err);
      showStatus(err.message || 'Failed to update payment status', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--gold-500)]/20">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl text-white font-bold tracking-wide flex items-center gap-2.5">
            <span>Orders Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--gold-500)]/20 text-[var(--gold-300)] border border-[var(--gold-500)]/30 font-semibold font-mono">
              {orders.length}
            </span>
          </h2>
          <p className="text-xs text-white/60">
            Track customer orders, manage statuses, WhatsApp concierge messaging, and print packing slips.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-lg border border-[var(--gold-500)]/40 text-[var(--gold-300)] hover:bg-[var(--gold-500)]/10 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#081438] p-4 rounded-xl border border-[var(--gold-500)]/20 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--gold-300)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order #, customer, phone, city..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--navy-900)] border border-white/10 text-white text-xs focus:border-[var(--gold-300)] focus:outline-none"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[var(--navy-900)] border border-white/10 text-white text-xs focus:outline-none"
            >
              <option value="All">All Statuses</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <span>Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-[var(--navy-900)] border border-white/10 text-white text-xs focus:outline-none"
            >
              <option value="All">All Time</option>
              <option value="today">Today (24h)</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-[var(--gold-500)]/25 overflow-hidden bg-[#081438] shadow-xl">
        {filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-[var(--gold-300)] mx-auto opacity-50" />
            <h4 className="font-heading text-lg font-bold text-white">No Orders Found</h4>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Orders placed by customers through the storefront will display here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#03091D] text-[var(--gold-300)] uppercase tracking-wider text-[10px] font-heading border-b border-[var(--gold-500)]/20">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Phone / City</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setAdminNoteInput(ord.adminNotes || '');
                        }}
                        className="font-mono font-bold text-[var(--gold-300)] hover:underline flex items-center gap-1.5"
                      >
                        <span>{ord.orderNumber}</span>
                        <ChevronRight className="w-3 h-3 text-white/30" />
                      </button>
                    </td>

                    <td className="p-4 text-white/60 whitespace-nowrap">
                      {formatOrderDate(ord.createdAt)}
                    </td>

                    <td className="p-4">
                      <span className="font-semibold text-white block">
                        {ord.customer?.fullName}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {ord.items?.length || 1} item(s)
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="text-white block font-mono text-[11px]">
                        {ord.customer?.phone}
                      </span>
                      <span className="text-[10px] text-[var(--gold-300)]">
                        {ord.customer?.city}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-white whitespace-nowrap">
                      Rs. {ord.totalAmount?.toLocaleString()}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {renderPaymentBadge(ord)}
                    </td>

                    <td className="p-4">
                      {/* Direct Inline Status Changer */}
                      <select
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord.id!, e.target.value as OrderStatus)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border focus:outline-none cursor-pointer ${renderStatusBadge(
                          ord.status
                        )}`}
                      >
                        {statusOptions.map((st) => (
                          <option key={st} value={st} className="bg-[#050F2E] text-white">
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp Message */}
                        <button
                          onClick={() => handleMessageCustomerOnWhatsApp(ord)}
                          className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-500/30 transition-colors"
                          title="Message customer on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Invoice */}
                        <button
                          onClick={() => handlePrintSlip(ord)}
                          className="p-1.5 rounded-lg bg-[var(--navy-900)] text-[var(--gold-300)] hover:bg-[var(--gold-500)]/20 border border-[var(--gold-500)]/30 transition-colors"
                          title="Print Shipping Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setAdminNoteInput(ord.adminNotes || '');
                          }}
                          className="p-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white border border-white/10 transition-colors"
                          title="View Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Order */}
                        <button
                          onClick={() => handleDeleteOrder(ord)}
                          className="p-1.5 rounded-lg bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-500/30 transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER DETAIL MODAL / DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#050F2E] border-2 border-[var(--gold-500)]/40 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--gold-500)]/25">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-heading text-lg sm:text-xl font-bold text-white">
                    Order #{selectedOrder.orderNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${renderStatusBadge(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <span className="text-xs text-white/50 block mt-1">
                  Placed on {formatOrderDate(selectedOrder.createdAt)} • Payment: {selectedOrder.paymentMethod || 'Cash on Delivery'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintSlip(selectedOrder)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--gold-500)]/40 text-[var(--gold-300)] hover:bg-[var(--gold-500)]/10 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="p-4 rounded-xl bg-[#081438] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-heading uppercase tracking-wider text-[var(--gold-300)] block">
                  Change Order Status
                </span>
                <span className="text-xs text-white/60">
                  Changing to Cancelled automatically returns reserved stock to inventory.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id!, e.target.value as OrderStatus)}
                  className="px-4 py-2 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/40 text-[var(--gold-300)] font-bold text-xs focus:outline-none"
                >
                  {statusOptions.map((st) => (
                    <option key={st} value={st} className="bg-[#050F2E] text-white">
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Status Management (Updates paymentStatus field only) */}
            <div className="p-4 rounded-xl bg-[#081438] border border-[var(--gold-500)]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-heading uppercase tracking-wider text-[var(--gold-300)] block font-semibold">
                  Payment Verification & Status
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {renderPaymentBadge(selectedOrder)}
                  <span className="text-[11px] text-white/50">
                    Method: <strong className="text-white">{selectedOrder.paymentMethod === 'online' ? 'Online Transfer' : 'Cash on Delivery (COD)'}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={loadingAction || selectedOrder.paymentStatus === 'Payment Verified'}
                  onClick={() => handleUpdatePaymentStatus(selectedOrder.id!, 'Payment Verified')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Mark Payment as Verified"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified</span>
                </button>

                <button
                  type="button"
                  disabled={loadingAction || selectedOrder.paymentStatus === 'Payment Rejected'}
                  onClick={() => handleUpdatePaymentStatus(selectedOrder.id!, 'Payment Rejected')}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Mark Payment as Rejected"
                >
                  <X className="w-3.5 h-3.5 text-rose-400" />
                  <span>Rejected</span>
                </button>

                <button
                  type="button"
                  disabled={loadingAction || selectedOrder.paymentStatus === 'Awaiting Payment'}
                  onClick={() => handleUpdatePaymentStatus(selectedOrder.id!, 'Awaiting Payment')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Set status back to Awaiting Payment"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Awaiting Payment</span>
                </button>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recipient */}
              <div className="p-4 rounded-xl bg-[#081438] border border-white/10 space-y-2">
                <span className="text-[10px] font-heading uppercase tracking-widest text-[var(--gold-300)] font-semibold block">
                  Customer Information
                </span>
                <div className="text-xs text-white space-y-1">
                  <p className="font-bold text-sm text-white">{selectedOrder.customer.fullName}</p>
                  <p className="font-mono text-white/80">{selectedOrder.customer.phone}</p>
                  {selectedOrder.customer.email && (
                    <p className="text-white/60">{selectedOrder.customer.email}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleMessageCustomerOnWhatsApp(selectedOrder)}
                    className="btn-gold-outline w-full py-2 rounded text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span>Message on WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="p-4 rounded-xl bg-[#081438] border border-white/10 space-y-2">
                <span className="text-[10px] font-heading uppercase tracking-widest text-[var(--gold-300)] font-semibold block">
                  Delivery Address & City
                </span>
                <div className="text-xs text-white space-y-1">
                  <p className="font-semibold text-white">City: <span className="text-[var(--gold-300)]">{selectedOrder.customer.city}</span></p>
                  <p className="text-white/80 leading-relaxed">{selectedOrder.customer.address}</p>
                  {selectedOrder.customer.notes && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[10px] uppercase text-white/40 block">Customer Delivery Note:</span>
                      <p className="italic text-white/70 text-[11px] mt-0.5">{selectedOrder.customer.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Snapshotted Purchased Items */}
            <div className="space-y-3">
              <span className="text-[10px] font-heading uppercase tracking-widest text-[var(--gold-300)] font-semibold block">
                Purchased Items (Price & Name Recorded at Checkout)
              </span>

              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#081438] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.productImage || '/src/assets/images/royal_gold_front_1791271735003.jpg'}
                        alt={item.productName}
                        className="w-12 h-12 rounded-lg object-cover bg-black border border-white/10"
                      />
                      <div>
                        <h5 className="font-heading text-xs font-bold text-white">
                          {item.productName}
                        </h5>
                        <span className="text-[11px] text-white/50 block">
                          Size: <strong className="text-white">{item.size}</strong> • Qty: <strong className="text-white">{item.quantity}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-heading text-xs font-bold text-[var(--gold-300)] block">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-white/40">
                        (Rs. {item.price.toLocaleString()} each)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="p-4 rounded-xl bg-[#03091D] border border-white/10 space-y-1.5 text-xs text-white/70">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-white">Rs. {Number(selectedOrder.subtotal).toLocaleString()}</span>
                </div>
                {(selectedOrder.handlingFee !== undefined && selectedOrder.handlingFee > 0) && (
                  <div className="flex justify-between">
                    <span>Product Handling Charges:</span>
                    <span className="text-white">Rs. {Number(selectedOrder.handlingFee).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charges:</span>
                  <span className={selectedOrder.shippingFee === 0 ? 'text-emerald-400 font-semibold' : 'text-white'}>
                    {selectedOrder.shippingFee === 0 ? 'FREE (Rs. 0)' : `Rs. ${Number(selectedOrder.shippingFee).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>Total Amount:</span>
                  <span className="text-[var(--gold-300)] font-heading">
                    Rs. {Number(selectedOrder.totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="space-y-2">
              <span className="text-[10px] font-heading uppercase tracking-widest text-[var(--gold-300)] font-semibold block">
                Internal Admin Notes
              </span>
              <textarea
                rows={2}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="e.g. Courier tracking code: TRAX-894123, confirmed address via phone..."
                className="w-full p-3 rounded-lg bg-[var(--navy-900)] border border-white/10 text-white text-xs focus:border-[var(--gold-300)] focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAdminNote}
                  disabled={loadingAction}
                  className="px-4 py-1.5 rounded-lg bg-[var(--gold-500)]/20 border border-[var(--gold-500)]/40 text-[var(--gold-300)] hover:bg-[var(--gold-500)]/30 text-xs font-semibold"
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder)}
                className="px-4 py-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Order</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSlip(selectedOrder)}
                  className="px-4 py-2 rounded-lg bg-[var(--gold-500)]/20 border border-[var(--gold-500)]/40 text-[var(--gold-300)] hover:bg-[var(--gold-500)]/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal for Order Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(orderToDelete)}
        title="Delete Customer Order"
        itemName={orderToDelete ? `Order #${orderToDelete.orderNumber}` : ''}
        message="Are you sure you want to permanently delete this order record? This action cannot be reversed."
        isDeleting={isDeletingOrder}
        errorMessage={deleteOrderError}
        onConfirm={confirmDeleteOrder}
        onCancel={() => {
          if (!isDeletingOrder) {
            setOrderToDelete(null);
            setDeleteOrderError(null);
          }
        }}
      />

      {/* In-App Printable Slip Preview Modal (Guarantees print works in iframes and triggers browser print) */}
      {printPreviewOrder && (() => {
        const slipSubtotal = Number(printPreviewOrder.subtotal || 0);
        const slipTotalPayable = slipSubtotal + Number(slipHandlingFee || 0) + Number(slipShippingFee || 0);

        return (
          <div
            id="muaver-printable-slip-overlay"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-montserrat"
          >
            <div
              id="muaver-printable-slip"
              className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl relative border border-slate-200"
            >
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b-2 border-[#D4AF37] pb-4">
                <div className="space-y-1">
                  <img
                    src={settings.landscapeLogoUrl || 'https://i.ibb.co/8n6t1tQH/Untitled-design.png'}
                    alt="MUAVER"
                    className="w-[140px] max-w-[140px] h-auto object-contain block"
                  />
                  <div className="text-[10px] uppercase tracking-widest text-[#B89025] font-semibold mt-1">
                    Crafted for Distinction By Ashar Ul Haq Siddiqui
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="text-base sm:text-lg font-bold font-heading text-[#0A1A4F] tracking-wider uppercase">
                    {printPreviewOrder.paymentMethod === 'online' ? 'OFFICIAL INVOICE' : 'CASH ON DELIVERY SLIP'}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    Order #: <span className="text-[#0A1A4F]">{printPreviewOrder.orderNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Date: {formatOrderDate(printPreviewOrder.createdAt)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Central Depot: Karachi Distribution Hub
                  </div>

                  {/* Online Orders Only: PAID or PAYMENT PENDING badge */}
                  {printPreviewOrder.paymentMethod === 'online' && (
                    <div className="pt-1.5">
                      {printPreviewOrder.paymentStatus === 'Payment Verified' ? (
                        <span className="px-3 py-1 rounded-md bg-emerald-100 border-2 border-emerald-600 text-emerald-800 font-extrabold text-xs uppercase tracking-widest inline-flex items-center gap-1 shadow-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>PAID</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-md bg-amber-100 border-2 border-amber-600 text-amber-900 font-extrabold text-xs uppercase tracking-widest inline-flex items-center gap-1 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>PAYMENT PENDING</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer and Dispatch Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Consignee */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <h5 className="font-bold text-[10px] text-[#B89025] uppercase tracking-wider">
                    Consignee & Delivery Address
                  </h5>
                  <p className="font-semibold text-sm text-slate-900">{printPreviewOrder.customer.fullName}</p>
                  <p className="font-mono text-slate-700">{printPreviewOrder.customer.phone}</p>
                  {printPreviewOrder.customer.email && (
                    <p className="text-slate-500 text-[11px]">{printPreviewOrder.customer.email}</p>
                  )}
                  <p className="text-slate-700 pt-0.5 leading-relaxed">
                    {printPreviewOrder.customer.address}, <strong className="text-slate-900">{printPreviewOrder.customer.city}</strong>
                  </p>
                  {printPreviewOrder.customer.notes && (
                    <p className="italic text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                      Delivery Note: {printPreviewOrder.customer.notes}
                    </p>
                  )}
                </div>

                {/* Dispatch & Verification */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-slate-700">
                  <h5 className="font-bold text-[10px] text-[#B89025] uppercase tracking-wider">
                    Shipment & Payment Specifications
                  </h5>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payment Mode:</span>
                    <strong className="text-slate-900">
                      {printPreviewOrder.paymentMethod === 'online' ? 'Online Transfer (Bank/Wallet)' : (printPreviewOrder.paymentMethod || 'Cash on Delivery (COD)')}
                    </strong>
                  </div>
                  {printPreviewOrder.paymentMethod === 'online' && (
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-500">Payment Status:</span>
                      {printPreviewOrder.paymentStatus === 'Payment Verified' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                          PAID
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                          PAYMENT PENDING
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Status:</span>
                    <strong className="text-slate-900">{printPreviewOrder.status}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inspection:</span>
                    <span className="text-emerald-700 font-medium">Open & Inspect at Doorstep</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Seal Security:</span>
                    <span className="text-slate-800 font-medium">Tamper-Proof Hologram Verified</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0A1A4F] text-[#F8F4E8] text-[10px] uppercase tracking-wider">
                      <th className="p-2.5">Item & Specification</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(printPreviewOrder.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <strong className="text-slate-900 block">{item.productName}</strong>
                          <span className="text-[10px] text-slate-500">Volume: {item.size}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          Rs. {Number(item.price).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                          Rs. {(Number(item.price) * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end text-xs">
                <div className="w-72 space-y-2 border-t-2 border-[#D4AF37] pt-3">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium text-slate-900">
                      Rs. {slipSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Handling Charges (Editable per order) */}
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span>Handling Charges:</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingHandling(!isEditingHandling)}
                        className="no-print p-0.5 text-slate-400 hover:text-[#B89025] transition-colors cursor-pointer"
                        title="Edit handling charges for this order"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </span>

                    {isEditingHandling ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 font-mono">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={slipHandlingFee}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setSlipHandlingFee(val);
                          }}
                          onBlur={() => handleSaveOrderFeeOverrides(slipHandlingFee, slipShippingFee)}
                          className="w-20 px-1.5 py-0.5 border border-[#D4AF37] rounded font-mono text-right text-xs bg-white text-slate-900 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingHandling(false);
                            handleSaveOrderFeeOverrides(slipHandlingFee, slipShippingFee);
                          }}
                          className="no-print p-0.5 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={slipHandlingFee === 0 ? 'text-slate-500 font-mono' : 'font-mono text-slate-900'}>
                        {slipHandlingFee === 0 ? 'FREE (Rs. 0)' : `Rs. ${slipHandlingFee.toLocaleString()}`}
                      </span>
                    )}
                  </div>

                  {/* Delivery Charges (Editable per order) */}
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span>Delivery Charges:</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingShipping(!isEditingShipping)}
                        className="no-print p-0.5 text-slate-400 hover:text-[#B89025] transition-colors cursor-pointer"
                        title="Edit delivery charges for this order"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </span>

                    {isEditingShipping ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 font-mono">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={slipShippingFee}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setSlipShippingFee(val);
                          }}
                          onBlur={() => handleSaveOrderFeeOverrides(slipHandlingFee, slipShippingFee)}
                          className="w-20 px-1.5 py-0.5 border border-[#D4AF37] rounded font-mono text-right text-xs bg-white text-slate-900 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingShipping(false);
                            handleSaveOrderFeeOverrides(slipHandlingFee, slipShippingFee);
                          }}
                          className="no-print p-0.5 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={slipShippingFee === 0 ? 'text-emerald-600 font-bold' : 'font-mono text-slate-900'}>
                        {slipShippingFee === 0 ? 'FREE (Rs. 0)' : `Rs. ${slipShippingFee.toLocaleString()}`}
                      </span>
                    )}
                  </div>

                  {/* Total Payable (Recalculated automatically: Subtotal + Handling Charges + Delivery Charges) */}
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                    <span className="text-xs uppercase font-bold text-slate-900">Total Payable:</span>
                    <span className="font-mono font-extrabold text-base text-[#0A1A4F]">
                      Rs. {slipTotalPayable.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Professional Footer */}
              <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 space-y-1 text-center">
                <p className="font-medium text-slate-700">
                  Thank you for shopping with MUAVER • Crafted for Distinction by Ashar Ul Haq Siddiqui
                </p>
                <p className="text-[10px] text-slate-400">
                  Customer Care WhatsApp: {settings.whatsappNumber || '+92 324 2404984'} • Email: {settings.contactEmail || 'hellomuaver@gmail.com'}
                </p>
                <p className="text-[9px] text-slate-400 italic">
                  * Please inspect tamper-evident sealed flacon packaging before tendering cash on delivery to courier personnel.
                </p>
              </div>

              {/* Action Buttons (Hidden on Print) */}
              <div className="no-print flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPrintPreviewOrder(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Close Preview
                </button>

                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="px-6 py-2.5 rounded-lg bg-[#0A1A4F] hover:bg-[#101E42] text-white text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-[#D4AF37]" />
                  <span>Print Slip / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
