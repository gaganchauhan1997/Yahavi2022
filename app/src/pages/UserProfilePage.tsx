import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  User, Package, Heart, Download, CreditCard, MapPin,
  LogOut, ChevronRight, ShoppingBag, Phone, Mail, Calendar,
  Edit2, Camera, CheckCircle, Loader2, AlertCircle,
  HeadphonesIcon, Plus, Trash2, Save, FileDown, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser, logout, updateCurrentUser } from '@/lib/auth';
import { WP_REST_BASE } from '@/lib/api-base';
import { getAuthToken } from '@/lib/auth-token';
import { useStore } from '@/context/StoreContext';
import ProductCard from '@/components/ProductCard';

const mainItems = [
  { id: 'profile',   label: 'My Profile',        icon: User },
  { id: 'downloads', label: 'My Downloads',       icon: Download },
  { id: 'wishlist',  label: 'My Wishlist',        icon: Heart },
  { id: 'payments',  label: 'Payment Methods',    icon: CreditCard },
  { id: 'addresses', label: 'Manage Addresses',   icon: MapPin },
];

const allTabs = new Set([...mainItems.map(i => i.id), 'orders']);

interface WCOrder {
  id: number;
  number: string;
  date_created: string;
  status: string;
  total: string;
  line_items: { name: string; product_id: number; quantity: number; total: string }[];
}

interface WCDownload {
  download_id: string;
  download_url: string;
  product_id: number;
  product_name: string;
  file: { name: string; file: string };
  access_expires: string | null;
  downloads_remaining: string | number;
  download_count: number;
}

function authFetch(path: string) {
  const token = getAuthToken();
  return fetch(`${WP_REST_BASE}${path}`, {
    headers: { Authorization: token ? `Bearer ${token}` : '', Accept: 'application/json' },
  });
}

function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    authFetch(path)
      .then(r => {
        if (!r.ok) throw new Error(`Request failed: ${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(d => { if (active) { setData(d); setLoading(false); } })
      .catch(e => { if (active) { setError(e.message); setLoading(false); } });
    return () => { active = false; };
  }, [path]);
  return { data, loading, error };
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading...
    </div>
  );
}

function ErrorBlock({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />{msg || 'Failed to load. Please try again.'}
    </div>
  );
}

/* ── Downloads ─────────────────────────────────────────────────────────── */
const RenderDownloads = () => {
  const { data, loading, error } = useFetch<{ downloads: WCDownload[] }>('/my-downloads');
  if (loading) return <LoadingBlock />;
  if (error)   return <ErrorBlock msg={error} />;
  const downloads = data?.downloads ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Downloads</h2>
        {downloads.length > 0 && <span className="text-sm text-gray-500">{downloads.length} file{downloads.length !== 1 ? 's' : ''}</span>}
      </div>

      {downloads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FileDown className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <h3 className="font-semibold text-gray-700 mb-2">No Downloads Yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            After completing a purchase, your files appear here. You can re-download for up to 30 days.
          </p>
          <Link to="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 bg-hack-black text-white rounded-full text-sm font-medium hover:bg-hack-black/80 transition-colors">
            <ShoppingBag className="w-4 h-4" /> Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {downloads.map(dl => {
            const expires  = dl.access_expires ? new Date(dl.access_expires) : null;
            const expired  = expires ? expires < new Date() : false;
            const daysLeft = expires ? Math.ceil((expires.getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={dl.download_id} className={`bg-white rounded-xl border p-6 transition-all ${expired ? 'border-red-200 opacity-70' : 'border-gray-200 hover:shadow-md'}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-hack-yellow/20 to-hack-orange/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Download className="w-7 h-7 text-hack-black" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{dl.product_name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{dl.file?.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {dl.download_count > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <FileDown className="w-3.5 h-3.5" />Downloaded {dl.download_count}×
                          </span>
                        )}
                        {daysLeft !== null && !expired && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />{daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                          </span>
                        )}
                        {expired && <span className="text-xs text-red-500 font-medium">Link expired</span>}
                      </div>
                    </div>
                  </div>
                  {!expired ? (
                    <a href={dl.download_url} download target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-hack-black text-white rounded-full hover:bg-hack-black/80 transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0">
                      <Download className="w-4 h-4" />Download Now
                    </a>
                  ) : (
                    <Link to="/support"
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-full text-sm text-gray-500 hover:border-hack-yellow transition-colors whitespace-nowrap flex-shrink-0">
                      <HeadphonesIcon className="w-4 h-4" />Contact Support
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {downloads.length > 0 && (
        <p className="text-xs text-gray-400 text-center pt-2">
          Downloads valid 30 days from purchase.{' '}
          <a href="mailto:support@hackknow.com" className="underline hover:text-hack-black">support@hackknow.com</a>
          {' '}| <a href="tel:+918796018700" className="underline hover:text-hack-black">+91 87960 18700</a>
        </p>
      )}
    </div>
  );
};

/* ── Orders (only paid) ────────────────────────────────────────────────── */
const RenderOrders = () => {
  const { data, loading, error } = useFetch<{ orders: WCOrder[] }>('/my-orders');
  if (loading) return <LoadingBlock />;
  if (error)   return <ErrorBlock msg={error} />;
  const orders = (data?.orders ?? []).filter(o => ['completed', 'processing'].includes(o.status));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Orders</h2>
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <ShoppingBag className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <h3 className="font-semibold text-gray-700 mb-2">No Orders Yet</h3>
          <p className="text-sm text-gray-400 mb-6">Completed purchases will appear here.</p>
          <Link to="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 bg-hack-black text-white rounded-full text-sm font-medium hover:bg-hack-black/80 transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : orders.map(order => (
        <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b">
            <div>
              <p className="font-semibold">Order #{order.number}</p>
              <p className="text-sm text-gray-500">{new Date(order.date_created).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-bold text-lg">₹{parseFloat(order.total).toLocaleString('en-IN')}</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                <CheckCircle className="w-3.5 h-3.5" />
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
          {order.line_items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity} · ₹{parseFloat(item.total).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/* ── Addresses ─────────────────────────────────────────────────────────── */
interface SavedAddress { id: string; label: string; name: string; line1: string; city: string; state: string; pincode: string; phone: string; }

const RenderAddresses = () => {
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => {
    const _u = getCurrentUser(); const _ak = _u?.id ? `hackknow-addresses-${_u.id}` : 'hackknow-addresses'; try { return JSON.parse(localStorage.getItem(_ak) || '[]'); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: 'Home', name: '', line1: '', city: '', state: '', pincode: '', phone: '' });

  const save = () => {
    if (!form.name.trim() || !form.line1.trim() || !form.city.trim()) return;
    const next = [...addresses, { ...form, id: Date.now().toString() }];
    setAddresses(next);
    const _u = getCurrentUser(); const _ak = _u?.id ? `hackknow-addresses-${_u.id}` : 'hackknow-addresses'; localStorage.setItem(_ak, JSON.stringify(next));
    setAdding(false);
    setForm({ label: 'Home', name: '', line1: '', city: '', state: '', pincode: '', phone: '' });
  };

  const remove = (id: string) => {
    const next = addresses.filter(a => a.id !== id);
    setAddresses(next);
    const _u = getCurrentUser(); const _ak = _u?.id ? `hackknow-addresses-${_u.id}` : 'hackknow-addresses'; localStorage.setItem(_ak, JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Addresses</h2>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)} className="gap-2 bg-hack-black text-white hover:bg-hack-black/80">
            <Plus className="w-4 h-4" />Add Address
          </Button>
        )}
      </div>

      {adding && (
        <div className="bg-white rounded-xl border border-hack-yellow/40 p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">New Address</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Label</label>
              <select value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-hack-yellow bg-white">
                <option>Home</option><option>Office</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Address *</label>
            <Input value={form.line1} onChange={e => setForm({ ...form, line1: e.target.value })} placeholder="Flat / House no., Street, Area" className="text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">City *</label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">State</label>
              <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Pincode</label>
              <Input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" maxLength={6} className="text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" type="tel" className="text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={save} className="gap-2 bg-hack-black text-white hover:bg-hack-black/80 flex-1"><Save className="w-4 h-4" />Save Address</Button>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !adding ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <MapPin className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <h3 className="font-semibold text-gray-700 mb-2">No Addresses Saved</h3>
          <p className="text-sm text-gray-400 mb-6">Save your address for faster checkout.</p>
          <Button onClick={() => setAdding(true)} className="gap-2 bg-hack-black text-white hover:bg-hack-black/80">
            <Plus className="w-4 h-4" />Add Address
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {addresses.map(addr => (
            <div key={addr.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-hack-yellow/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-hack-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{addr.label}</span>
                    <span className="font-medium text-sm">{addr.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">{addr.line1}</p>
                  <p className="text-sm text-gray-500">{[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>
                  {addr.phone && <p className="text-xs text-gray-400 mt-1">{addr.phone}</p>}
                </div>
              </div>
              <button onClick={() => remove(addr.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Payment Methods ───────────────────────────────────────────────────── */
const RenderPaymentMethods = () => {
  const [saved, setSaved] = useState<{ upi?: string; cardName?: string }>(() => {
    const _u = getCurrentUser(); const _pk = _u?.id ? `hackknow-payment-${_u.id}` : 'hackknow-payment-info'; try { return JSON.parse(localStorage.getItem(_pk) || '{}'); } catch { return {}; }
  });
  const [editing, setEditing] = useState(!saved.upi && !saved.cardName);
  const [form, setForm] = useState({ upi: saved.upi || '', cardName: saved.cardName || '' });

  const savePayment = () => {
    const _u = getCurrentUser(); const _pk = _u?.id ? `hackknow-payment-${_u.id}` : 'hackknow-payment-info'; localStorage.setItem(_pk, JSON.stringify(form));
    setSaved(form);
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Payment Methods</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-800">Saved Payment Info</h3>
            <p className="text-xs text-gray-400 mt-0.5">Saved locally for autofill. Never stored on servers.</p>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Edit2 className="w-3.5 h-3.5" />Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">UPI ID</label>
              <Input value={form.upi} onChange={e => setForm({ ...form, upi: e.target.value })} placeholder="yourname@upi" className="max-w-sm" />
              <p className="text-xs text-gray-400 mt-1">e.g. name@okicici, phone@gpay, name@paytm</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Cardholder Name (for autofill)</label>
              <Input value={form.cardName} onChange={e => setForm({ ...form, cardName: e.target.value })} placeholder="Name as on card" className="max-w-sm" />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              🔒 Card numbers are never saved here. All payments go through Razorpay's secure gateway.
            </p>
            <div className="flex gap-3">
              <Button onClick={savePayment} className="gap-2 bg-hack-black text-white hover:bg-hack-black/80">
                <Save className="w-4 h-4" />Save
              </Button>
              {(saved.upi || saved.cardName) && (
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {saved.upi && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-lg font-bold text-purple-600">₹</div>
                <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide">UPI ID</p><p className="font-medium">{saved.upi}</p></div>
              </div>
            )}
            {saved.cardName && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cardholder Name</p><p className="font-medium">{saved.cardName}</p></div>
              </div>
            )}
            {!saved.upi && !saved.cardName && (
              <div className="text-center py-6">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">No payment info saved yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-700">Payments powered by Razorpay</p>
          <p className="text-xs text-gray-500 mt-0.5">UPI, Debit/Credit Cards, Net Banking & Wallets. All transactions encrypted.</p>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function UserProfilePage() {
  const { section } = useParams<{ section?: string }>();
  const navigate    = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, toggleWishlist } = useStore();

  const avatarKey = () => {
    const user = getCurrentUser();
    return user?.id ? `hackknow-avatar-${user.id}` : 'hackknow-avatar';
  };

  const [avatarSrc, setAvatarSrc] = useState<string>(() => localStorage.getItem(avatarKey()) || '');
  const [isEditing, setIsEditing] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [userData, setUserData] = useState(() => ({
    name: 'Hackknow User', email: '', phone: '', joinedDate: '', isVerified: false,
    ...getCurrentUser(),
  }));

  const activeTab = useMemo(() => section && allTabs.has(section) ? section : 'profile', [section]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      setAvatarSrc(src);
      localStorage.setItem(avatarKey(), src);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    updateCurrentUser({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
    });
    setProfileSaved(true);
    setIsEditing(false);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center overflow-hidden">
              {avatarSrc
                ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-hack-black select-none">{(userData.name || 'H').charAt(0).toUpperCase()}</span>}
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-hack-yellow/10 transition-colors"
              title="Upload photo">
              <Camera className="w-4 h-4 text-gray-600" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{userData.name}</h2>
            <p className="text-gray-500 text-sm">{userData.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {userData.isVerified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />Verified
                </span>
              )}
              {userData.joinedDate && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />Member since {userData.joinedDate}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 shrink-0">
            <Edit2 className="w-4 h-4" />{isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
        {profileSaved && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
            <CheckCircle className="w-4 h-4" />Profile updated successfully.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">Personal Information</h3>
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input type="email" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input type="tel" value={userData.phone || ''} onChange={e => setUserData({ ...userData, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSaveProfile} className="w-full bg-hack-black text-white hover:bg-hack-black/80">Save Changes</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="flex items-center gap-3"><User className="w-5 h-5 text-gray-300 flex-shrink-0" /><div><p className="text-gray-500 text-xs mb-0.5">Full Name</p><p className="font-medium">{userData.name}</p></div></div>
            <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-gray-300 flex-shrink-0" /><div><p className="text-gray-500 text-xs mb-0.5">Email</p><p className="font-medium">{userData.email || '—'}</p></div></div>
            <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-gray-300 flex-shrink-0" /><div><p className="text-gray-500 text-xs mb-0.5">Phone</p><p className="font-medium">{userData.phone || 'Not set'}</p></div></div>
            <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-gray-300 flex-shrink-0" /><div><p className="text-gray-500 text-xs mb-0.5">Member Since</p><p className="font-medium">{userData.joinedDate || '—'}</p></div></div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':   return renderProfile();
      case 'downloads': return <RenderDownloads />;
      case 'wishlist': {
        const wishlistProducts = state.products.filter(p => state.wishlist.includes(p.id));
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">My Wishlist</h2>
            {wishlistProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <Heart className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                <h3 className="font-semibold text-gray-700 mb-2">Wishlist is Empty</h3>
                <p className="text-sm text-gray-400 mb-6">Save products you love and find them here later.</p>
                <Link to="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 bg-hack-black text-white rounded-full text-sm font-medium hover:bg-hack-black/80 transition-colors">
                  <ShoppingBag className="w-4 h-4" />Browse Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlistProducts.map(product => (
                  <div key={product.id} className="relative">
                    <ProductCard product={product} />
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'payments':  return <RenderPaymentMethods />;
      case 'addresses': return <RenderAddresses />;
      case 'orders':    return <RenderOrders />;
      default:          return renderProfile();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-hack-black">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-hack-black font-medium">My Account</span>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-4 bg-hack-black text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarSrc
                      ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                      : <span className="font-bold text-sm">{(userData.name || 'H').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/50">Hello,</p>
                    <p className="font-bold text-sm truncate">{userData.name}</p>
                  </div>
                </div>
              </div>

              <nav className="p-2">
                {mainItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id}
                      onClick={() => navigate(item.id === 'profile' ? '/account' : `/account/${item.id}`)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        activeTab === item.id ? 'bg-hack-yellow/10 text-hack-black font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />{item.label}
                    </button>
                  );
                })}

                <div className="border-t my-2" />

                {/* Support */}
                <Link to="/support"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <HeadphonesIcon className="w-4 h-4 flex-shrink-0" />Support
                </Link>

                {/* My Orders — bottom */}
                <button onClick={() => navigate('/account/orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                    activeTab === 'orders' ? 'bg-hack-yellow/10 text-hack-black font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <Package className="w-4 h-4 flex-shrink-0" />My Orders
                </button>

                <div className="border-t mt-2 pt-2">
                  <button onClick={() => { logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4 flex-shrink-0" />Logout
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}