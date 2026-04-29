import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  User, Package, Heart, Download, CreditCard, MapPin,
  Bell, Shield, LogOut, ChevronRight, ShoppingBag,
  Phone, Mail, Calendar, Edit2, Camera, CheckCircle, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser, logout } from '@/lib/auth';
import { WP_REST_BASE } from '@/lib/api-base';
import { getAuthToken } from '@/lib/auth-token';

const sidebarItems = [
  { id: 'profile',       label: 'My Profile',        icon: User },
  { id: 'orders',        label: 'My Orders',          icon: Package },
  { id: 'downloads',     label: 'My Downloads',       icon: Download },
  { id: 'wishlist',      label: 'My Wishlist',        icon: Heart },
  { id: 'payments',      label: 'Payment Methods',    icon: CreditCard },
  { id: 'addresses',     label: 'Manage Addresses',   icon: MapPin },
  { id: 'notifications', label: 'Notifications',      icon: Bell },
  { id: 'security',      label: 'Login & Security',   icon: Shield },
];

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
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    },
  });
}

function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    authFetch(path)
      .then(r => r.json())
      .then(d => { if (active) { setData(d); setLoading(false); } })
      .catch(e => { if (active) { setError(e.message); setLoading(false); } });
    return () => { active = false; };
  }, [path]);
  return { data, loading, error };
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      Loading...
    </div>
  );
}

function ErrorBlock({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      {msg || 'Failed to load. Please try again.'}
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>{label}</p>
    </div>
  );
}

const RenderOrders = () => {
  const { data, loading, error } = useFetch<{ orders: WCOrder[] }>('/my-orders');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;
  const orders = data?.orders ?? [];
  if (!orders.length) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Orders</h2>
      <EmptyBlock label="You haven't placed any orders yet." />
    </div>
  );
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Orders</h2>
      {orders.map(order => (
        <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b">
            <div>
              <p className="text-sm text-gray-500">Order #{order.number}</p>
              <p className="text-sm text-gray-500">Placed on {new Date(order.date_created).toLocaleDateString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">₹{parseFloat(order.total).toLocaleString('en-IN')}</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                <CheckCircle className="w-4 h-4" />
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
          {order.line_items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-500">Qty: {item.quantity} · ₹{parseFloat(item.total).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const RenderDownloads = () => {
  const { data, loading, error } = useFetch<{ downloads: WCDownload[] }>('/my-downloads');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;
  const downloads = data?.downloads ?? [];
  if (!downloads.length) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Downloads</h2>
      <EmptyBlock label="No downloadable products found. Complete an order to see downloads here." />
    </div>
  );
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Downloads</h2>
      <div className="grid gap-4">
        {downloads.map(dl => (
          <div key={dl.download_id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-hack-yellow/20 to-hack-orange/20 rounded-lg flex items-center justify-center">
                  <Download className="w-7 h-7 text-hack-black" />
                </div>
                <div>
                  <h3 className="font-medium">{dl.product_name}</h3>
                  <p className="text-sm text-gray-500">{dl.file?.name}</p>
                  {dl.access_expires && (
                    <p className="text-xs text-gray-400">Expires: {new Date(dl.access_expires).toLocaleDateString('en-IN')}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Downloaded {dl.download_count} time{dl.download_count !== 1 ? 's' : ''}
                    {dl.downloads_remaining !== 'unlimited' ? ` · ${dl.downloads_remaining} left` : ''}
                  </p>
                </div>
              </div>
              <a
                href={dl.download_url}
                className="inline-flex items-center gap-2 px-4 py-2 bg-hack-black text-white rounded-lg hover:bg-hack-black/80 transition-colors text-sm font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4" />
                Download Now
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function UserProfilePage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(() => ({
    name: 'Hackknow User',
    email: '',
    phone: '',
    joinedDate: '',
    isVerified: false,
    ...getCurrentUser(),
  }));

  const activeTab = useMemo(() => {
    const allowed = new Set(sidebarItems.map(i => i.id));
    return section && allowed.has(section) ? section : 'profile';
  }, [section]);

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center text-3xl font-bold text-hack-black">
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{userData.name}</h2>
            <p className="text-gray-500">{userData.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {userData.isVerified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              )}
              {userData.joinedDate && (
                <span className="text-sm text-gray-400">Member since {userData.joinedDate}</span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>
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
              <Input type="tel" value={userData.phone || ''} onChange={e => setUserData({ ...userData, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => setIsEditing(false)} className="w-full">Save Changes</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div><p className="text-gray-500">Full Name</p><p className="font-medium">{userData.name}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div><p className="text-gray-500">Email</p><p className="font-medium">{userData.email || '—'}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{userData.phone || 'Not set'}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div><p className="text-gray-500">Member Since</p><p className="font-medium">{userData.joinedDate || '—'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':       return renderProfile();
      case 'orders':        return <RenderOrders />;
      case 'downloads':     return <RenderDownloads />;
      case 'wishlist':      return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">My Wishlist</h2><p className="mt-2 text-sm text-gray-500">Saved items will appear here.</p></div>;
      case 'payments':      return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Payment Methods</h2><p className="mt-2 text-sm text-gray-500">Payments are processed securely via Razorpay.</p></div>;
      case 'addresses':     return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Manage Addresses</h2><p className="mt-2 text-sm text-gray-500">Your billing addresses will appear here.</p></div>;
      case 'notifications': return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Notifications</h2><p className="mt-2 text-sm text-gray-500">Notification preferences will appear here.</p></div>;
      case 'security':      return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Login & Security</h2><p className="mt-2 text-sm text-gray-500">Security settings will appear here.</p></div>;
      default:              return renderProfile();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-hack-black">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-hack-black">My Account</span>
          </div>
        </div>
      </div>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-4 bg-hack-black text-white">
                <p className="text-sm text-white/60">Hello,</p>
                <p className="font-bold truncate">{userData.name}</p>
              </div>
              <nav className="p-2">
                {sidebarItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id === 'profile' ? '/account' : `/account/${item.id}`)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        activeTab === item.id
                          ? 'bg-hack-yellow/10 text-hack-black font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
                <div className="border-t mt-2 pt-2">
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </nav>
            </div>
          </div>
          <div className="flex-1">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
