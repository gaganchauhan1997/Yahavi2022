
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CategorySidebar from './components/CategorySidebar';
import YahaviAI from './components/YahaviAI';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AboutPage from './pages/AboutPage';
import SupportPage from './pages/SupportPage';
import SignupPage from './pages/SignupPage';

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
        <Header />
        <CategorySidebar />
        <CartDrawer />
        <main>
          <Routes>
            <Route path="/" element={<ShopPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:category" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/account" element={<Navigate to="/login" replace />} />
            <Route path="/account/wishlist" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </StoreProvider>
  );
}

export default App;
