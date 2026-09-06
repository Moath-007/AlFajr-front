import { lazy, Suspense, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { Category, Order, Product, Representative } from '@/types';
import type { LoginUserResponseDto } from '@/api';
import { useAuth } from '@/auth';
import Toast from '@/components/ui/Toast';

import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import HomePage from '@/components/public/HomePage';
import ProductsPage from '@/components/public/ProductsPage';
import ProductDetailsPage from '@/components/public/ProductDetailsPage';
import CategoriesPage from '@/components/public/CategoriesPage';
import AboutPage from '@/components/public/AboutPage';
import ContactPage from '@/components/public/ContactPage';
import CartPage from '@/components/public/CartPage';
import CheckoutPage from '@/components/public/CheckoutPage';
import AnnouncementBar from '@/components/public/AnnouncementBar';
import CompanyProfileNotice from '@/components/public/CompanyProfileNotice';
import { PublicCatalogProvider } from '@/public/PublicCatalogProvider';
import { PublicCompanyProvider } from '@/public/PublicCompanyProvider';
import { PublicCartProvider } from '@/public/PublicCartProvider';

import LoginPage from '@/components/auth/LoginPage';
import RequireRole from '@/components/auth/RequireRole';

const OwnerSidebar = lazy(() => import('@/components/owner/OwnerSidebar'));
const OwnerDashboard = lazy(() => import('@/components/owner/OwnerDashboard'));
const OwnerProducts = lazy(() => import('@/components/owner/OwnerProducts'));
const OwnerCategories = lazy(() => import('@/components/owner/OwnerCategories'));
const OwnerInventory = lazy(() => import('@/components/owner/OwnerInventory'));
const OwnerReps = lazy(() => import('@/components/owner/OwnerReps'));
const OwnerOrders = lazy(() => import('@/components/owner/OwnerOrders'));
const OwnerReports = lazy(() => import('@/components/owner/OwnerReports'));
const OwnerSettings = lazy(() => import('@/components/owner/OwnerSettings'));

const RepSidebar = lazy(() => import('@/components/rep/RepSidebar'));
const RepDashboard = lazy(() => import('@/components/rep/RepDashboard'));
const WholesaleProductsPage = lazy(() => import('@/components/rep/WholesaleProductsPage'));
const RepOrders = lazy(() => import('@/components/rep/RepOrders'));
const WholesaleProductDetailsPage = lazy(() => import('@/components/rep/WholesaleProductDetailsPage'));

type AppStore = ReturnType<typeof useStore>;
type NavigateHandler = (page: string, params?: Record<string, string>) => void;

export default function App() {
    const store = useStore();
    const navigate = useNavigate();

    const handleNavigate = useCallback((page: string, params: Record<string, string> = {}) => {
        let path = '/';
        if (page === 'home') path = '/';
        else if (page === 'products') path = '/products';
        else if (page === 'categories') path = '/categories';
        else if (page === 'about') path = '/about';
        else if (page === 'contact') path = '/contact';
        else if (page === 'cart') path = '/cart';
        else if (page === 'checkout') path = '/checkout';
        else if (page === 'product-details') path = `/products/${params.id}`;
        else if (page === 'login') path = '/login';
        else if (page === 'owner-login') path = '/owner/login';
        else if (page === 'owner-dashboard' || page === 'dashboard') path = '/owner';
        else if (page === 'owner-products' || page === 'products-mgmt') path = '/owner/products';
        else if (page === 'owner-categories') path = '/owner/categories';
        else if (page === 'owner-inventory') path = '/owner/inventory';
        else if (page === 'owner-reps') path = '/owner/reps';
        else if (page === 'owner-orders') path = '/owner/orders';
        else if (page === 'owner-reports') path = '/owner/reports';
        else if (page === 'owner-settings') path = '/owner/settings';
        else if (page === 'rep-login') path = '/rep/login';
        else if (page === 'rep-dashboard') path = '/rep';
        else if (page === 'rep-products') path = '/rep/products';
        else if (page === 'rep-create-order' || page === 'create-order') path = '/rep/create-order';
        else if (page === 'rep-my-orders' || page === 'my-orders') path = '/rep/orders';

        const queryString = new URLSearchParams(params).toString();
        const finalPath = queryString && !path.includes(':') ? `${path}?${queryString}` : path;

        navigate(finalPath);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [navigate]);

    return (
        <>
            <Suspense fallback={<div className="grid min-h-screen place-items-center bg-stone-50 text-sm font-bold text-stone-500">جاري تحميل الصفحة…</div>}>
            <Routes>
                <Route path="/login" element={<LoginRoute store={store} />} />
                <Route path="/owner/login" element={<LoginRoute store={store} />} />
                <Route path="/rep/login" element={<LoginRoute store={store} />} />

                <Route path="/owner/*" element={
                    <RequireRole role="Admin">
                        <OwnerLayout store={store} />
                    </RequireRole>
                } />

                <Route path="/rep/*" element={
                    <RequireRole role="Representative">
                        <RepLayout store={store} onNavigate={handleNavigate} />
                    </RequireRole>
                } />

                <Route path="/*" element={<PublicSiteLayout onNavigate={handleNavigate} />} />
            </Routes>
            </Suspense>

            <Toast notifications={store.notifications} onDismiss={store.dismissNotification} />
        </>
    );
}

function LoginRoute({ store }: { store: AppStore }) {
    const { user, login } = useAuth();
    const navigate = useNavigate();

    if (user) {
        return <Navigate to={user.role === 'Admin' ? '/owner' : '/rep'} replace />;
    }

    return (
        <LoginPage
            onLogin={async (email, password) => {
                const authenticatedUser = await login({ email, password });
                store.notify(`مرحباً بك، ${authenticatedUser.name}`, 'success');
                navigate(authenticatedUser.role === 'Admin' ? '/owner' : '/rep', { replace: true });
                return authenticatedUser;
            }}
            onBack={() => navigate('/')}
        />
    );
}

function OwnerLayout({ store }: { store: AppStore }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    return (
        <div className="min-h-screen bg-stone-50 flex" dir="rtl">
            <OwnerSidebar
                currentPage={location.pathname.replace('/owner', '').replace('/', '') || 'dashboard'}
                onNavigate={(p) => navigate(p === 'dashboard' ? '/owner' : `/owner/${p}`)}
                onLogout={() => { logout(); navigate('/'); }}
            />
            <main className="flex-1 min-w-0 p-4 lg:p-8">
                <div className="mx-auto max-w-6xl">
                    <Routes>
                        <Route path="" element={<OwnerDashboard products={store.products} categories={store.categories} reps={store.reps} orders={store.orders} onNavigate={(p) => navigate(`/owner/${p}`)} />} />
                        <Route path="products" element={<OwnerProducts products={store.products} categories={store.categories} onAdd={store.addProduct} onUpdate={store.updateProduct} onDelete={store.deleteProduct} onNotify={store.notify} />} />
                        <Route path="categories" element={<OwnerCategories categories={store.categories} products={store.products} onAdd={store.addCategory} onUpdate={store.updateCategory} onDelete={store.deleteCategory} onNotify={store.notify} />} />
                        <Route path="inventory" element={<OwnerInventory products={store.products} categories={store.categories} />} />
                        <Route path="reps" element={<OwnerReps reps={store.reps} orders={store.orders} onAdd={store.addRep} onUpdate={store.updateRep} onToggle={store.toggleRepStatus} onNotify={store.notify} />} />
                        <Route path="orders" element={<OwnerOrdersWrapper orders={store.orders} reps={store.reps} updateOrderStatus={store.updateOrderStatus} notify={store.notify} />} />
                        <Route path="reports" element={<OwnerReports products={store.products} categories={store.categories} reps={store.reps} orders={store.orders} />} />
                        <Route path="settings" element={<OwnerSettings settings={store.settings} onUpdate={store.updateSettings} onNotify={store.notify} />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

function OwnerOrdersWrapper({ orders, reps, updateOrderStatus, notify }: {
    orders: Order[];
    reps: Representative[];
    updateOrderStatus: AppStore['updateOrderStatus'];
    notify: AppStore['notify'];
}) {
    const [searchParams] = useSearchParams();
    return <OwnerOrders orders={orders} reps={reps} onUpdateStatus={updateOrderStatus} onNotify={notify} initialOrderId={searchParams.get('id') || undefined} />;
}

function RepLayout({ store, onNavigate }: { store: AppStore; onNavigate: NavigateHandler }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const navigateWithinRep = useCallback((page: string, params: Record<string, string> = {}) => {
        const path = page === 'dashboard'
            ? '/rep'
            : page === 'my-orders'
                ? '/rep/orders'
                : `/rep/${page}`;
        const queryString = new URLSearchParams(params).toString();
        navigate(queryString ? `${path}?${queryString}` : path);
    }, [navigate]);

    if (!user) return null;

    const currentRep = getMockRepresentative(user, store.reps);

    return (
        <div className="min-h-screen bg-stone-50 flex" dir="rtl">
            <RepSidebar
                currentPage={location.pathname.replace('/rep', '').replace('/', '') || 'dashboard'}
                onNavigate={navigateWithinRep}
                onLogout={() => { logout(); navigate('/'); }}
                repName={currentRep.name}
            />
            <main className="flex-1 min-w-0 p-4 lg:p-8">
                <div className="mx-auto max-w-6xl">
                    <Routes>
                        <Route path="" element={<RepDashboard orders={store.orders} rep={currentRep} onNavigate={navigateWithinRep} />} />

                        <Route
                            path="create-order"
                            element={
                                <WholesaleProductsPage
                                    products={store.products}
                                    onSelectProduct={(product: Product) => navigate(`/rep/products/${product.id}`)}
                                />
                            }
                        />

                        <Route
                            path="products/:id"
                            element={<RepProductDetailsWrapper products={store.products} categories={store.categories} onNavigate={onNavigate} />}
                        />

                        <Route path="orders" element={<RepOrdersWrapper orders={store.orders} rep={currentRep} onNavigate={onNavigate} />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

function RepOrdersWrapper({ orders, rep, onNavigate }: {
    orders: Order[];
    rep: Representative;
    onNavigate: NavigateHandler;
}) {
    const [searchParams] = useSearchParams();
    return <RepOrders orders={orders} rep={rep} onNavigate={onNavigate} initialOrderId={searchParams.get('id') || undefined} />;
}

function RepProductDetailsWrapper({ products, categories, onNavigate }: {
    products: Product[];
    categories: Category[];
    onNavigate: NavigateHandler;
}) {
    const { id } = useParams();
    const navigate = useNavigate();
    const product = products.find((p) => p.id === id);
    if (!product) return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-stone-500 font-bold">المنتج غير موجود</div>;
    const category = categories.find((c) => c.id === product.categoryId);
    return (
        <WholesaleProductDetailsPage
            product={product}
            category={category}
            onNavigate={onNavigate}
            onBack={() => navigate('/rep/create-order')}
        />
    );
}

function PublicSiteLayout({ onNavigate }: { onNavigate: NavigateHandler }) {
    return (
        <PublicCompanyProvider>
            <PublicCartProvider>
                <PublicCatalogProvider>
                    <PublicSiteContent onNavigate={onNavigate} />
                </PublicCatalogProvider>
            </PublicCartProvider>
        </PublicCompanyProvider>
    );
}

function PublicSiteContent({ onNavigate }: { onNavigate: NavigateHandler }) {
    const navigate = useNavigate();
    const location = useLocation();
    const searchQuery = new URLSearchParams(location.search).get('search') ?? '';
    return (
        <div className="min-h-screen flex flex-col bg-stone-50" dir="rtl">
            <div className="sticky top-0 z-50 w-full max-w-full">
                <AnnouncementBar />
                <PublicHeader
                    onNavigate={onNavigate}
                    currentPath={location.pathname}
                    onSearch={(query) => navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products')}
                    searchQuery={searchQuery}
                />
            </div>
            <CompanyProfileNotice />
            <div className="flex-1">
                <Routes>
                    <Route path="" element={<HomePage onNavigate={onNavigate} />} />
                    <Route path="products" element={<ProductsPage onNavigate={onNavigate} />} />
                    <Route path="products/:id" element={<PublicProductDetailsWrapper />} />
                    <Route path="categories" element={<CategoriesPage onNavigate={onNavigate} />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="cart" element={<CartPage onNavigate={onNavigate} />} />
                    <Route path="checkout" element={<CheckoutPage onNavigate={onNavigate} />} />
                </Routes>
            </div>
            <PublicFooter onNavigate={onNavigate} />
        </div>
    );
}

function getMockRepresentative(user: LoginUserResponseDto, representatives: Representative[]): Representative {
    return representatives.find((representative) => representative.email === user.email) ?? {
        id: `api-user-${user.id}`,
        name: user.name,
        phone: '',
        username: user.email,
        password: '',
        email: user.email,
        active: true,
        createdAt: '',
    };
}

function PublicProductDetailsWrapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) return <div className="mx-auto max-w-7xl px-4 py-16 text-center font-bold text-stone-500">المنتج غير متوفر حاليًا</div>;
    return <ProductDetailsPage productId={productId} onBack={() => navigate('/products')} />;
}
