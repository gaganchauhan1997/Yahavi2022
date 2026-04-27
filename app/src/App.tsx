import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import CategorySidebar from './components/CategorySidebar';
import AuthGuard from './components/AuthGuard';
import Footer from './components/Footer';
import Header from './components/Header';
import YahaviAI from './components/YahaviAI';
import { StoreProvider } from './context/StoreContext';
import AboutPage from './pages/AboutPage';
import AffiliatePage from './pages/AffiliatePage';
import BlogPage from './pages/BlogPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CommunityPage from './pages/CommunityPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ProductPage from './pages/ProductPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import ShopPage from './pages/ShopPage';
import SignupPage from './pages/SignupPage';
import SupportPage from './pages/SupportPage';
import TermsPage from './pages/TermsPage';
import UserProfilePage from './pages/UserProfilePage';

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
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:category" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/affiliate" element={<AffiliatePage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/account"
              element={
                <AuthGuard>
                  <UserProfilePage />
                </AuthGuard>
              }
            />
            <Route
              path="/account/:section"
              element={
                <AuthGuard>
                  <UserProfilePage />
                </AuthGuard>
              }
            />
            <Route path="/profile" element={<Navigate to="/account" replace />} />
            <Route path="/my-account" element={<Navigate to="/account" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </StoreProvider>
  );
}

export default App;
