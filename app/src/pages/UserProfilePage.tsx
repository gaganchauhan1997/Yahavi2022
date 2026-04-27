import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  User, Package, Heart, Download, CreditCard, MapPin,
  Bell, Shield, LogOut, ChevronRight, ShoppingBag,
  Phone, Mail, Calendar, Edit2, Camera, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser, logout } from '@/lib/auth';

// Mock user data - replace with actual API calls when JWT auth is fully wired
const mockUser = {
  name: 'Hackknow User',
  email: 'user@hackknow.com',
  phone: '+91 00000 00000',
  avatar: null,
  joinedDate: 'January 2024',
  isVerified: true
};

const mockOrders = [
  {
    id: 'ORD-001',
    date: '2024-01-15',
    total: 1299,
    status: 'Delivered',
    items: [
      { name: 'Premium PowerPoint Templates', image: '/product1.jpg', price: 1299 }
    ]
  },
  {
    id: 'ORD-002',
    date: '2024-01-10',
    total: 2499,
    status: 'Downloaded',
    items: [
      { name: 'Excel Dashboard Bundle', image: '/product2.jpg', price: 2499 }
    ]
  }
];

const mockDownloads = [
  {
    id: 1,
    name: 'Premium PowerPoint Templates',
    downloadUrl: '#',
    expiresOn: '2025-01-15',
    downloadCount: 3
  },
  {
    id: 2,
    name: 'Excel Dashboard Bundle',
    downloadUrl: '#',
    expiresOn: '2025-01-10',
    downloadCount: 1
  }
];

const sidebarItems = [
  { id: 'profile', label: 'My Profile', icon: User, active: true },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'downloads', label: 'My Downloads', icon: Download },
  { id: 'wishlist', label: 'My Wishlist', icon: Heart },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'addresses', label: 'Manage Addresses', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Login & Security', icon: Shield },
];

export default function UserProfilePage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(() => ({
    ...mockUser,
    ...getCurrentUser(),
  }));
  const activeTab = useMemo(() => {
    const allowedSections = new Set(sidebarItems.map((item) => item.id));
    return section && allowedSections.has(section) ? section : 'profile';
  }, [section]);

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center text-3xl font-bold text-hack-black">
              {userData.name.charAt(0)}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{userData.name}</h2>
            <p className="text-gray-500">{userData.email}</p>
            <p className="text-gray-500">{userData.phone}</p>
            <div className="flex items-center gap-2 mt-2">
              {userData.isVerified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              )}
              <span className="text-sm text-gray-400">Member since {userData.joinedDate}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-hack-black">12</div>
          <div className="text-sm text-gray-500">Total Orders</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-hack-black">8</div>
          <div className="text-sm text-gray-500">Downloads</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-hack-black">5</div>
          <div className="text-sm text-gray-500">Wishlist Items</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-hack-black">₹12K</div>
          <div className="text-sm text-gray-500">Total Spent</div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">Personal Information</h3>
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input 
                value={userData.name} 
                onChange={(e) => setUserData({...userData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input 
                type="email"
                value={userData.email} 
                onChange={(e) => setUserData({...userData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number *</label>
              <Input 
                type="tel"
                value={userData.phone} 
                onChange={(e) => setUserData({...userData, phone: e.target.value})}
                placeholder="+91 98765 43210"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Required for order updates</p>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setIsEditing(false)} className="w-full">Save Changes</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-500">Full Name</p>
                <p className="font-medium">{userData.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{userData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-500">Phone Number *</p>
                <p className="font-medium">{userData.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-500">Member Since</p>
                <p className="font-medium">{userData.joinedDate}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Orders</h2>
      {mockOrders.map((order) => (
        <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b">
            <div>
              <p className="text-sm text-gray-500">Order #{order.id}</p>
              <p className="text-sm text-gray-500">Placed on {order.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">₹{order.total}</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                order.status === 'Downloaded' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                <CheckCircle className="w-4 h-4" />
                {order.status}
              </span>
            </div>
          </div>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-500">₹{item.price}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Download</Button>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderDownloads = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Downloads</h2>
      <div className="grid gap-4">
        {mockDownloads.map((download) => (
          <div key={download.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-hack-yellow/20 to-hack-orange/20 rounded-lg flex items-center justify-center">
                  <Download className="w-8 h-8 text-hack-black" />
                </div>
                <div>
                  <h3 className="font-medium">{download.name}</h3>
                  <p className="text-sm text-gray-500">Expires on {download.expiresOn}</p>
                  <p className="text-sm text-gray-500">Downloaded {download.downloadCount} times</p>
                </div>
              </div>
              <Button className="bg-hack-black hover:bg-hack-black/90">
                <Download className="w-4 h-4 mr-2" />
                Download Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfile();
      case 'orders': return renderOrders();
      case 'downloads': return renderDownloads();
      case 'wishlist': return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">My Wishlist</h2><p className="mt-2 text-sm text-gray-500">Saved items will appear here.</p></div>;
      case 'payments': return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Payment Methods</h2><p className="mt-2 text-sm text-gray-500">Saved payment methods will appear here.</p></div>;
      case 'addresses': return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Manage Addresses</h2><p className="mt-2 text-sm text-gray-500">Your billing and shipping addresses will appear here.</p></div>;
      case 'notifications': return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Notifications</h2><p className="mt-2 text-sm text-gray-500">Notification preferences will appear here.</p></div>;
      case 'security': return <div className="bg-white rounded-xl border border-gray-200 p-6"><h2 className="text-2xl font-bold">Login & Security</h2><p className="mt-2 text-sm text-gray-500">Security settings will appear here.</p></div>;
      default: return renderProfile();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
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
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-4 bg-hack-black text-white">
                <p className="text-sm text-white/60">Hello,</p>
                <p className="font-bold truncate">{userData.name}</p>
              </div>
              <nav className="p-2">
                {sidebarItems.map((item) => {
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
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
