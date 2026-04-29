import { Component, Suspense, lazy, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import CartDrawer from './components/CartDrawer';
import CategorySidebar from './components/CategorySidebar';
import AuthGuard from './components/AuthGuard';
import Footer from './components/Footer';
import Header from './components/Header';
import MobileBottomBar from './components/MobileBottomBar';
import YahaviAI from './components/YahaviAI';
import CookieConsent from './components/CookieConsent';
import { StoreProvider } from './context/StoreContext';
import { installFetchInterceptor } from './lib/fetch-interceptor';

// HomePage loads eagerly (above-the-fold)
import HomePage from './pages/HomePage';

// All other pages load lazily (only when needed)
const ShopPage            = lazy(() => import('./pages/ShopPage'));
const ProductPage         = lazy(() => import('./pages/ProductPage'));
const CartPage            = lazy(() => import('./pages/CartPage'));
const CheckoutPage        = lazy(() => import('./pages/CheckoutPage'));
const AboutPage           = lazy(() => import('./pages/AboutPage'));
const CommunityPage       = lazy(() => import('./pages/CommunityPage'));
const SupportPage         = lazy(() => import('./pages/SupportPage'));
const ContactPage         = lazy(() => import('./pages/ContactPage'));
const AffiliatePage       = lazy(() => import('./pages/AffiliatePage'));
const BlogPage            = lazy(() => import('./pages/BlogPage'));
const FAQPage             = lazy(() => import('./pages/FAQPage'));
const PrivacyPolicyPage   = lazy(() => import('./pages/PrivacyPolicyPage'));
const RefundPolicyPage    = lazy(() => import('./pages/RefundPolicyPage'));
const TermsPage           = lazy(() => import('./pages/TermsPage'));
const SignupPage          = lazy(() => import('./pages/SignupPage'));
const LoginPage           = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage  = lazy(() => import('./pages/ForgotPasswordPage'));
const UserProfilePage     = lazy(() => import('./pages/UserProfilePage'));
const OrderPendingPage    = lazy(() => import('./pages/OrderPendingPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-hack-yellow border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

interface EBState { hasError: boolean }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-hack-black text-hack-white p-8 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Something went wrong</h1>
          <p className="text-hack-white/60 mb-6">An unexpected error occurred. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-hack-yellow text-hack-black rounded-full font-bold"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    installFetchInterceptor();
  }, []);

  return (
    <ErrorBoundary>
      <StoreProvider>
        <YahaviAI />
        <Router>
          <ScrollToTop />
          <Header />
          <CategorySidebar />
          <CartDrawer />
          <main>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"                    element={<HomePage />} />
                <Route path="/shop"                element={<ShopPage />} />
                <Route path="/shop/:category"      element={<ShopPage />} />
                <Route path="/product/:slug"       element={<ProductPage />} />
                <Route path="/cart"                element={<CartPage />} />
                <Route path="/checkout"            element={<CheckoutPage />} />
                <Route path="/order-pending"       element={<OrderPendingPage />} />
                <Route path="/about"               element={<AboutPage />} />
                <Route path="/community"           element={<CommunityPage />} />
                <Route path="/support"             element={<SupportPage />} />
                <Route path="/contact"             element={<ContactPage />} />
                <Route path="/affiliate"           element={<AffiliatePage />} />
                <Route path="/blog"                element={<BlogPage />} />
                <Route path="/faq"                 element={<FAQPage />} />
                <Route path="/privacy"             element={<PrivacyPolicyPage />} />
                <Route path="/refund-policy"       element={<RefundPolicyPage />} />
                <Route path="/terms"               element={<TermsPage />} />
                <Route path="/signup"              element={<SignupPage />} />
                <Route path="/login"               element={<LoginPage />} />
                <Route path="/forgot-password"     element={<ForgotPasswordPage />} />
                <Route path="/account"             element={<AuthGuard><UserProfilePage /></AuthGuard>} />
                <Route path="/account/:section"    element={<AuthGuard><UserProfilePage /></AuthGuard>} />
                <Route path="/profile"             element={<Navigate to="/account" replace />} />
                <Route path="/my-account"          element={<Navigate to="/account" replace />} />
                <Route path="*"                    element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <MobileBottomBar />
        </Router>
        <Toaster richColors position="top-right" />
        <CookieConsent />
      </StoreProvider>
    </ErrorBoundary>
  );
}

export default App;
