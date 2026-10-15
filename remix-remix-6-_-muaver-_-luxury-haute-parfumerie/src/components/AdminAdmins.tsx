import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Crown, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  AlertCircle, 
  Check, 
  ShieldAlert, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { AdminUser, AdminRole } from '../types/store';
import { 
  ADMIN_SETUP, 
  isPermanentAdminEmail, 
  isPermanentOwnerEmail, 
  isTechnicalSupportEmail 
} from '../config/constants';
import { 
  getAdmins, 
  subscribeAdmins,
  addAdminUser, 
  updateAdminRole, 
  removeAdminUser 
} from '../services/storeService';

interface AdminAdminsProps {
  currentUserEmail: string;
  currentUserRole: AdminRole;
}

export const AdminAdmins: React.FC<AdminAdminsProps> = ({
  currentUserEmail,
  currentUserRole,
}) => {
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New admin form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('admin');

  // Confirmation modal for deleting admin
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);

  const isOwner = currentUserRole === 'owner';

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  const loadAdmins = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await getAdmins();
      setAdminsList(list);
    } catch (err: any) {
      console.error('Error loading admins:', err);
      showError(err.message || 'Failed to retrieve administrator directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAdmins(
      (list) => {
        setAdminsList(list);
        setLoading(false);
      },
      (err: any) => {
        console.error('Error in live admins listener:', err);
        showError(err.message || 'Failed to retrieve administrator directory.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      showError('Please provide a valid email address.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      await addAdminUser(
        newEmail.trim(),
        newRole,
        currentUserEmail,
        newDisplayName.trim() || undefined
      );
      showSuccess(`Account "${newEmail.toLowerCase().trim()}" successfully added as ${newRole.toUpperCase()}.`);
      setNewEmail('');
      setNewDisplayName('');
      setNewRole('admin');
      setShowAddForm(false);
      await loadAdmins();
    } catch (err: any) {
      console.error('Add admin error:', err);
      showError(err.message || 'Failed to add administrator.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleToggle = async (admin: AdminUser) => {
    if (!isOwner) {
      showError('Only an Owner can modify administrator privileges.');
      return;
    }

    if (isPermanentAdminEmail(admin.email)) {
      showError('Operation Blocked: Permanent owner accounts cannot be modified.');
      return;
    }

    const nextRole: AdminRole = admin.role === 'owner' ? 'admin' : 'owner';
    setActionLoading(true);
    setErrorMessage(null);

    try {
      await updateAdminRole(admin.email, nextRole, currentUserEmail);
      showSuccess(`Updated ${admin.email} privilege to ${nextRole.toUpperCase()}.`);
      await loadAdmins();
    } catch (err: any) {
      console.error('Role update error:', err);
      showError(err.message || 'Could not change administrator role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;

    if (isPermanentAdminEmail(adminToDelete.email)) {
      showError('Operation Blocked: Permanent owner accounts cannot be removed.');
      setAdminToDelete(null);
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      await removeAdminUser(adminToDelete.email, currentUserEmail);
      showSuccess(`Administrator ${adminToDelete.email} has been revoked.`);
      setAdminToDelete(null);
      await loadAdmins();
    } catch (err: any) {
      console.error('Delete admin error:', err);
      showError(err.message || 'Could not remove administrator.');
    } finally {
      setActionLoading(false);
    }
  };

  // Main "Registered Accounts" list:
  // - Permanent Owner (hellomuaver@gmail.com) is always present
  // - The two technical support accounts MUST NOT appear in this list (shown in Technical Support card below)
  // - Any admins added later through "Add Administrator" appear as normal
  // - De-duplicate by normalized lowercase email
  const uniqueAdmins = React.useMemo(() => {
    const map = new Map<string, AdminUser>();
    const ownerEmail = ADMIN_SETUP.permanentOwner.email.toLowerCase();

    // Default permanent owner entry
    map.set(ownerEmail, {
      id: ownerEmail,
      email: ownerEmail,
      role: 'owner',
      displayName: ADMIN_SETUP.permanentOwner.displayName,
      createdAt: null,
      addedBy: 'Permanent Owner Setup',
    });

    for (const a of adminsList) {
      const emailKey = (a.email || a.id).toLowerCase().trim();
      if (!emailKey) continue;

      // Filter out technical support accounts completely from the main list
      if (isTechnicalSupportEmail(emailKey)) {
        continue;
      }

      if (emailKey === ownerEmail) {
        const current = map.get(ownerEmail)!;
        map.set(ownerEmail, {
          ...current,
          id: a.id || ownerEmail,
          displayName: a.displayName || ADMIN_SETUP.permanentOwner.displayName,
          createdAt: a.createdAt || current.createdAt,
          addedBy: a.addedBy || current.addedBy,
        });
        continue;
      }

      if (!map.has(emailKey)) {
        map.set(emailKey, a);
      } else {
        const existing = map.get(emailKey)!;
        if (!existing.id.includes('@') && a.id.includes('@')) {
          map.set(emailKey, a);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (a.role !== 'owner' && b.role === 'owner') return 1;
      return a.email.localeCompare(b.email);
    });
  }, [adminsList]);

  const totalOwners = uniqueAdmins.filter((a) => a.role === 'owner').length;

  return (
    <div className="space-y-8 animate-fade-in font-montserrat">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--gold-500)]/20 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--gold-300)]" />
            <h3 className="font-heading text-xl text-white font-bold tracking-wide">
              Authorized Administrators
            </h3>
          </div>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Console access is governed strictly by the <code className="text-[var(--gold-300)] bg-white/5 px-1.5 py-0.5 rounded font-mono">admins</code> collection in Firestore. Only emails registered here are permitted entry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdmins}
            disabled={loading}
            className="p-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isOwner && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-gold px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Administrator</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Owner-Only Notice */}
      {!isOwner && (
        <div className="p-4 rounded-xl bg-[#081438] border border-blue-500/30 text-blue-300 text-xs flex items-center gap-3">
          <ShieldAlert className="w-4 h-4 shrink-0 text-blue-400" />
          <span>
            You are logged in with the <strong>Admin</strong> role. Managing administrator accounts requires <strong>Owner</strong> privileges.
          </span>
        </div>
      )}

      {/* Add New Admin Form Drawer / Card */}
      {showAddForm && isOwner && (
        <form
          onSubmit={handleCreateAdmin}
          className="p-6 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/40 space-y-4 animate-fade-in shadow-2xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[var(--gold-300)]" />
              <span>Grant Admin Console Access</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block mb-1">
                Admin Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="client@domain.com"
                className="w-full bg-[#050F2E] border border-[var(--gold-500)]/30 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--gold-500)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block mb-1">
                Full / Display Name (Optional)
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="e.g. Managing Director"
                className="w-full bg-[#050F2E] border border-[var(--gold-500)]/30 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--gold-500)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block mb-1">
                Role Assignment <span className="text-rose-400">*</span>
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="w-full bg-[#050F2E] border border-[var(--gold-500)]/30 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--gold-500)] cursor-pointer"
              >
                <option value="owner">Owner (Full authority & admin management)</option>
                <option value="admin">Admin (Store & order management)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-gold px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              {actionLoading ? 'Granting...' : 'Authorize Email'}
            </button>
          </div>
        </form>
      )}

      {/* Main Registered Accounts Table */}
      <div className="p-6 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/25 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h4 className="font-heading text-base font-bold text-white">
              Registered Accounts ({uniqueAdmins.length})
            </h4>
            <p className="text-xs text-white/50">
              Active Owners: <strong className="text-[var(--gold-300)]">{totalOwners}</strong> • Protection Safeguard: Permanent Owner is protected and at least 1 Owner must remain at all times.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--gold-500)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-white/50">Loading authorized administrators...</p>
          </div>
        ) : uniqueAdmins.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-[var(--gold-300)] mx-auto opacity-70" />
            <p className="text-sm text-white font-medium">No registered admins found in Firestore.</p>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              The primary Owner is maintained permanently.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase font-mono tracking-widest text-[var(--gold-300)]">
                  <th className="p-3.5">Administrator</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Granted By</th>
                  <th className="p-3.5">Status</th>
                  {isOwner && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {uniqueAdmins.map((admin) => {
                  const isCurrent = admin.email.toLowerCase() === currentUserEmail.toLowerCase();
                  const isPermanentOwner = isPermanentOwnerEmail(admin.email);
                  const isLastOwner = admin.role === 'owner' && totalOwners <= 1;

                  return (
                    <tr
                      key={admin.id || admin.email}
                      className={`hover:bg-white/5 transition-colors ${
                        isCurrent ? 'bg-[var(--gold-500)]/5' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${
                              admin.role === 'owner'
                                ? 'bg-[var(--gold-500)]/20 border-[var(--gold-500)] text-[var(--gold-300)]'
                                : 'bg-[#0A1A4F] border-white/20 text-white'
                            }`}
                          >
                            {admin.role === 'owner' ? (
                              <Crown className="w-4 h-4 text-[var(--gold-300)]" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-white/80" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                {admin.displayName || admin.email}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--gold-500)] text-[var(--navy-900)] font-bold">
                                  You
                                </span>
                              )}
                              {isPermanentOwner && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--gold-500)]/20 text-[var(--gold-300)] border border-[var(--gold-500)]/30 font-semibold">
                                  Permanent
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-white/50 font-mono block">
                              {admin.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        {admin.role === 'owner' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/50 text-[var(--gold-300)]">
                            <Crown className="w-3 h-3" />
                            <span>{isPermanentOwner ? 'Permanent Owner' : 'Owner'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950/60 border border-blue-500/40 text-blue-300">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Admin</span>
                          </span>
                        )}
                      </td>

                      {/* Added by */}
                      <td className="p-3.5 text-white/50 text-[11px] font-mono">
                        {admin.addedBy || 'System Setup'}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Authorized</span>
                        </span>
                      </td>

                      {/* Actions (Owner privilege) */}
                      {isOwner && (
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Role Switcher */}
                            {isPermanentOwner ? (
                              <button
                                type="button"
                                disabled
                                title="Permanent Owner privileges cannot be modified or demoted"
                                className="px-2.5 py-1 rounded text-[10px] font-semibold border opacity-40 cursor-not-allowed border-zinc-700 text-zinc-500"
                              >
                                Demote to Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleToggle(admin)}
                                disabled={actionLoading || isLastOwner}
                                title={
                                  isLastOwner
                                    ? 'Cannot demote the last remaining Owner'
                                    : `Switch role to ${admin.role === 'owner' ? 'Admin' : 'Owner'}`
                                }
                                className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all ${
                                  isLastOwner
                                    ? 'opacity-40 cursor-not-allowed border-zinc-700 text-zinc-500'
                                    : 'border-white/20 text-white/80 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                {admin.role === 'owner' ? 'Demote to Admin' : 'Promote to Owner'}
                              </button>
                            )}

                            {/* Revoke / Remove Button */}
                            {isPermanentOwner ? (
                              <button
                                type="button"
                                disabled
                                title="Permanent Owner account cannot be removed"
                                aria-label="Permanent Owner cannot be removed"
                                className="p-1.5 rounded text-zinc-600 opacity-40 cursor-not-allowed"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setAdminToDelete(admin)}
                                disabled={actionLoading || isLastOwner}
                                title={
                                  isLastOwner
                                    ? 'Cannot remove the last remaining Owner'
                                    : 'Revoke administrator access'
                                }
                                className={`p-1.5 rounded text-rose-400 hover:bg-rose-950/50 transition-colors ${
                                  isLastOwner ? 'opacity-30 cursor-not-allowed' : ''
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technical Support Access Card */}
      <div className="p-6 rounded-2xl bg-[#081438] border border-blue-500/25 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
          <div>
            <h4 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Technical Support Access</span>
            </h4>
            <p className="text-xs text-white/60 mt-0.5">
              Technical support access maintained by{' '}
              <a
                href="https://zevnora.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--gold-300)] hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Zevnora</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>{' '}
              Agency. It can be removed on request.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30 self-start sm:self-center">
            2 Support Accounts Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80 border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase font-mono tracking-widest text-[var(--gold-300)]">
                <th className="p-3.5">Support Account</th>
                <th className="p-3.5">Designation</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {ADMIN_SETUP.technicalSupport
                .filter((account) => {
                  const emailLower = account.email.toLowerCase().trim();
                  const nameLower = account.displayName.toLowerCase().trim();
                  return (
                    emailLower !== 'ai.alizaib@gmail.com' &&
                    emailLower !== 'ai.ali.zaib@gmail.com' &&
                    nameLower !== 'ali zaib'
                  );
                })
                .map((account) => {
                const isCurrent = account.email.toLowerCase() === currentUserEmail.toLowerCase();
                return (
                  <tr
                    key={account.email}
                    className={`hover:bg-white/5 transition-colors ${
                      isCurrent ? 'bg-[var(--gold-500)]/5' : ''
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border bg-blue-950/60 border-blue-500/30 text-blue-300">
                          <ShieldCheck className="w-4 h-4 text-blue-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {account.displayName}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--gold-500)] text-[var(--navy-900)] font-bold">
                                You
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                              Technical Support
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50 font-mono block">
                            {account.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-white/70 text-xs">
                      Technical Support & Maintenance
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950/60 border border-blue-500/40 text-blue-300">
                        <Crown className="w-3 h-3 text-[var(--gold-300)]" />
                        <span>Support Owner</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Active Support</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050F2E]/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#081438] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-heading text-base font-bold text-white">
                Revoke Console Access?
              </h3>
              <p className="text-xs text-white/60">
                Are you sure you want to remove <strong className="text-white">{adminToDelete.email}</strong>? They will be immediately blocked from signing into the MUAVER administrative console.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
