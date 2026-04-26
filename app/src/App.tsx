
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CategorySidebar from './components/CategorySidebar';
import ScrollToTop from './components/ScrollToTop';
import YahaviAI from './components/YahaviAI';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AboutPage from './pages/AboutPage';
import CommunityPage from './pages/CommunityPage';
import SupportPage from './pages/SupportPage';
import HomePage from './pages/HomePage';
import SignupPage from './pages/SignupPage';
import UserProfilePage from './pages/UserProfilePage';
import AuthGuard from './components/AuthGuard';


function LoginRedirect() {
  useEffect(() => {
    window.location.replace('https://shop.hackknow.com/my-account');
  }, []);
  return null;
}

function App() {
  return (
    <StoreProvider>
      <YahaviAI />
      <Router>
        <ScrollToTop />
        <Header />
        <CategorySidebar />
        <CartDrawer />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:category" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/account" element={<AuthGuard><UserProfilePage /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard><UserProfilePage /></AuthGuard>} />
            <Route path="/my-account" element={<AuthGuard><UserProfilePage /></AuthGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </StoreProvider>
  );
}

export default App;
