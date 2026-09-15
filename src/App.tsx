import { lazy, Suspense, useCallback, useRef, useState } from "react";
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/auth";
import Toast from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageTransition, {
  PageRouteFallback,
} from "@/components/ui/PageTransition";

import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import HomePage from "@/components/public/HomePage";
import ProductsPage from "@/components/public/ProductsPage";
import ProductDetailsPage from "@/components/public/ProductDetailsPage";
import CategoriesPage from "@/components/public/CategoriesPage";
import AboutPage from "@/components/public/AboutPage";
import ContactPage from "@/components/public/ContactPage";
import CartPage from "@/components/public/CartPage";
import CheckoutPage from "@/components/public/CheckoutPage";
import AnnouncementBar from "@/components/public/AnnouncementBar";
import CompanyProfileNotice from "@/components/public/CompanyProfileNotice";
import PublicNotFoundPage from "@/components/public/PublicNotFoundPage";
import { PublicCatalogProvider } from "@/public/PublicCatalogProvider";
import { PublicCompanyProvider } from "@/public/PublicCompanyProvider";
import { PublicCartProvider } from "@/public/PublicCartProvider";
import { WholesaleCartProvider, WholesaleStockVisibilityProvider, useWholesaleCart, useWholesaleStockVisibility } from "@/rep";

import LoginPage from "@/components/auth/LoginPage";
import RequireRole from "@/components/auth/RequireRole";

const OwnerSidebar = lazy(() => import("@/components/owner/OwnerSidebar"));
const OwnerDashboard = lazy(() => import("@/components/owner/OwnerDashboard"));
const AdminProductsPage = lazy(
  () => import("@/components/owner/AdminProductsPage"),
);
const AdminProductFormPage = lazy(
  () => import("@/components/owner/AdminProductFormPage"),
);
const AdminProductSettingsPage = lazy(
  () => import("@/components/owner/AdminProductSettingsPage"),
);
const AdminInventoryPage = lazy(
  () => import("@/components/owner/AdminInventoryPage"),
);
const AdminRepresentativesPage = lazy(
  () => import("@/components/owner/AdminRepresentativesPage"),
);
const AdminOrdersPage = lazy(
  () => import("@/components/owner/AdminOrdersPage"),
);
const AdminOrderDetailsPage = lazy(
  () => import("@/components/owner/AdminOrderDetailsPage"),
);
const AdminReceivablesPage = lazy(
  () => import("@/components/owner/AdminReceivablesPage"),
);
const AdminStoreSalePage = lazy(
  () => import("@/components/owner/AdminStoreSalePage"),
);
const AdminReportsPage = lazy(
  () => import("@/components/owner/AdminReportsPage"),
);
const AdminCompanyProfilePage = lazy(
  () => import("@/components/owner/AdminCompanyProfilePage"),
);
const AdminCustomerStatementPage = lazy(
  () => import("@/components/owner/AdminCustomerStatementPage"),
);
const AdminNotificationBell = lazy(
  () => import("@/components/owner/AdminNotificationBell"),
);

const RepSidebar = lazy(() => import("@/components/rep/RepSidebar"));
const RepDashboard = lazy(() => import("@/components/rep/RepDashboard"));
const WholesaleProductsPage = lazy(
  () => import("@/components/rep/WholesaleProductsPage"),
);
const RepOrders = lazy(() => import("@/components/rep/RepOrders"));
const WholesaleProductDetailsPage = lazy(
  () => import("@/components/rep/WholesaleProductDetailsPage"),
);
const CreateWholesaleOrderPage = lazy(
  () => import("@/components/rep/CreateWholesaleOrderPage"),
);
const RepOrderDetailsPage = lazy(
  () => import("@/components/rep/RepOrderDetailsPage"),
);
const EditRepOrderPage = lazy(
  () => import("@/components/rep/EditRepOrderPage"),
);
const RepReceivablesPage = lazy(
  () => import("@/components/rep/RepReceivablesPage"),
);

type AppStore = ReturnType<typeof useStore>;
type NavigateHandler = (page: string, params?: Record<string, string>) => void;

export default function App() {
  const store = useStore();
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (page: string, params: Record<string, string> = {}) => {
      let path = "/";
      if (page === "home") path = "/";
      else if (page === "products") path = "/products";
      else if (page === "categories") path = "/categories";
      else if (page === "about") path = "/about";
      else if (page === "contact") path = "/contact";
      else if (page === "cart") path = "/cart";
      else if (page === "checkout") path = "/checkout";
      else if (page === "product-details") path = `/products/${params.id}`;
      else if (page === "login") path = "/login";
      else if (page === "owner-login") path = "/owner/login";
      else if (page === "owner-dashboard" || page === "dashboard")
        path = "/owner";
      else if (page === "owner-products" || page === "products-mgmt")
        path = "/owner/products";
      else if (page === "owner-categories") path = "/owner/categories";
      else if (page === "owner-inventory") path = "/owner/inventory";
      else if (page === "owner-reps") path = "/owner/reps";
      else if (page === "owner-orders") path = "/owner/orders";
      else if (page === "owner-reports") path = "/owner/reports";
      else if (page === "owner-settings") path = "/owner/settings";
      else if (page === "rep-login") path = "/rep/login";
      else if (page === "rep-dashboard") path = "/rep";
      else if (page === "rep-products") path = "/rep/products";
      else if (page === "rep-create-order" || page === "create-order")
        path = "/rep/create-order";
      else if (page === "rep-my-orders" || page === "my-orders")
        path = "/rep/orders";

      const queryString = new URLSearchParams(params).toString();
      const finalPath =
        queryString && !path.includes(":") ? `${path}?${queryString}` : path;

      navigate(finalPath);
    },
    [navigate],
  );

  return (
    <>
      <Suspense
        fallback={
          <div className="grid min-h-screen place-items-center bg-stone-50 text-sm font-bold text-stone-500">
            جاري تحميل الصفحة…
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<LoginRoute store={store} />} />
          <Route path="/owner/login" element={<LoginRoute store={store} />} />
          <Route path="/rep/login" element={<LoginRoute store={store} />} />

          <Route
            path="/owner/*"
            element={
              <RequireRole role="Admin">
                <OwnerLayout store={store} />
              </RequireRole>
            }
          />

          <Route
            path="/rep/*"
            element={
              <RequireRole role="Representative">
                <WholesaleCartProvider>
                  <WholesaleStockVisibilityProvider><RepLayout /></WholesaleStockVisibilityProvider>
                </WholesaleCartProvider>
              </RequireRole>
            }
          />

          <Route
            path="/*"
            element={<PublicSiteLayout onNavigate={handleNavigate} />}
          />
        </Routes>
      </Suspense>

      <Toast
        notifications={store.notifications}
        onDismiss={store.dismissNotification}
      />
    </>
  );
}

function LoginRoute({ store }: { store: AppStore }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={user.role === "Admin" ? "/owner" : "/rep"} replace />;
  }

  return (
    <LoginPage
      onLogin={async (email, password) => {
        const authenticatedUser = await login({ email, password });
        store.notify(`مرحباً بك، ${authenticatedUser.name}`, "success");
        navigate(authenticatedUser.role === "Admin" ? "/owner" : "/rep", {
          replace: true,
        });
        return authenticatedUser;
      }}
      onBack={() => navigate("/")}
    />
  );
}

function OwnerLayout({ store }: { store: AppStore }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const ownerEditDirtyRef = useRef(false);
  const [, setOwnerEditDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const handleOwnerEditDirtyChange = useCallback((dirty: boolean) => {
    ownerEditDirtyRef.current = dirty;
    setOwnerEditDirty(dirty);
  }, []);
  const runOrConfirm = useCallback((action: () => void) => {
    if (ownerEditDirtyRef.current) setPendingAction(() => action);
    else action();
  }, []);
  const ownerNavigate = useCallback(
    (path: string) => runOrConfirm(() => navigate(path)),
    [navigate, runOrConfirm],
  );
  const ownerSection = location.pathname.startsWith("/owner/products")
    ? "products"
    : location.pathname.startsWith("/owner/orders")
      ? "orders"
      : location.pathname === "/owner/categories"
        ? "product-settings"
        : location.pathname === "/owner/settings"
          ? "company"
          : location.pathname.replace("/owner", "").replace("/", "") ||
            "dashboard";
  return (
    <div className="min-h-screen bg-stone-50 flex" dir="rtl">
      <Suspense fallback={<div className="hidden w-72 shrink-0 lg:block" />}>
        <OwnerSidebar
          currentPage={ownerSection}
          onNavigate={(p) =>
            ownerNavigate(
              p === "dashboard"
                ? "/owner"
                : p === "public-home"
                  ? "/"
                  : `/owner/${p}`,
            )
          }
          onLogout={() =>
            runOrConfirm(() => {
              logout();
              navigate("/");
            })
          }
          adminName={user?.name || "مدير النظام"}
        />
      </Suspense>
      <Suspense fallback={null}>
        <AdminNotificationBell onNavigate={ownerNavigate} />
      </Suspense>
      <main className="flex-1 min-w-0 p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<PageRouteFallback />}>
            <PageTransition>
              <Routes>
            <Route
              path=""
              element={
                <OwnerDashboard
                  onNavigate={(p) => ownerNavigate(`/owner/${p}`)}
                />
              }
            />
            <Route
              path="products"
              element={<AdminProductsPage onNavigate={ownerNavigate} />}
            />
            <Route
              path="products/new"
              element={
                <AdminProductFormPage
                  onNavigate={ownerNavigate}
                  onDirtyChange={handleOwnerEditDirtyChange}
                  onNotify={store.notify}
                />
              }
            />
            <Route
              path="products/:id"
              element={
                <AdminProductFormWrapper
                  onNavigate={ownerNavigate}
                  onDirtyChange={handleOwnerEditDirtyChange}
                  onNotify={store.notify}
                />
              }
            />
            <Route
              path="products/:id/edit"
              element={
                <AdminProductFormWrapper
                  onNavigate={ownerNavigate}
                  onDirtyChange={handleOwnerEditDirtyChange}
                  onNotify={store.notify}
                />
              }
            />
            <Route
              path="categories"
              element={<AdminProductSettingsPage onNotify={store.notify} />}
            />
            <Route path="inventory" element={<AdminInventoryPage />} />
            <Route
              path="reps"
              element={<AdminRepresentativesPage onNotify={store.notify} />}
            />
            <Route
              path="orders"
              element={<AdminOrdersPage onNavigate={ownerNavigate} />}
            />
            <Route
              path="orders/:id/edit"
              element={
                <AdminOrderEditWrapper
                  onNavigate={ownerNavigate}
                  onDirtyChange={handleOwnerEditDirtyChange}
                />
              }
            />
            <Route
              path="orders/:id"
              element={<AdminOrderDetailsWrapper onNavigate={ownerNavigate} />}
            />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route
              path="customer-statements"
              element={<AdminCustomerStatementPage />}
            />
            <Route
              path="settings"
              element={
                <AdminCompanyProfilePage
                  onDirtyChange={handleOwnerEditDirtyChange}
                  onNotify={store.notify}
                />
              }
            />
            <Route
              path="product-settings"
              element={<Navigate to="/owner/categories" replace />}
            />
            <Route
              path="company"
              element={<Navigate to="/owner/settings" replace />}
            />
            <Route
              path="store-sale"
              element={<AdminStoreSalePage onNavigate={ownerNavigate} />}
            />
            <Route path="receivables" element={<AdminReceivablesPage />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </div>
      </main>
      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          handleOwnerEditDirtyChange(false);
          action?.();
        }}
        title="تجاهل التغييرات؟"
        message="لديك تغييرات غير محفوظة في النموذج. هل تريد مغادرة الصفحة وفقدانها؟"
        confirmLabel="مغادرة دون حفظ"
        cancelLabel="متابعة التعديل"
      />
    </div>
  );
}

function AdminOrderDetailsWrapper({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { id } = useParams();
  const orderId = Number(id);
  return Number.isInteger(orderId) && orderId > 0 ? (
    <AdminOrderDetailsPage orderId={orderId} onNavigate={onNavigate} />
  ) : (
    <Navigate to="/owner/orders" replace />
  );
}

function AdminProductFormWrapper({
  onNavigate,
  onDirtyChange,
  onNotify,
}: {
  onNavigate: (path: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onNotify: AppStore["notify"];
}) {
  const { id } = useParams();
  const productId = Number(id);
  return Number.isInteger(productId) && productId > 0 ? (
    <AdminProductFormPage
      productId={productId}
      onNavigate={onNavigate}
      onDirtyChange={onDirtyChange}
      onNotify={onNotify}
    />
  ) : (
    <Navigate to="/owner/products" replace />
  );
}
function AdminOrderEditWrapper({
  onNavigate,
  onDirtyChange,
}: {
  onNavigate: (path: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { id } = useParams();
  const orderId = Number(id);
  return Number.isInteger(orderId) && orderId > 0 ? (
    <EditRepOrderPage
      orderId={orderId}
      onNavigate={onNavigate}
      onDirtyChange={onDirtyChange}
      mode="admin"
    />
  ) : (
    <Navigate to="/owner/orders" replace />
  );
}

function RepLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { totalQuantity } = useWholesaleCart();
  const { resetStockVisibility } = useWholesaleStockVisibility();
  const [, setEditDirty] = useState(false);
  const editDirtyRef = useRef(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const handleEditDirtyChange = useCallback((dirty: boolean) => {
    editDirtyRef.current = dirty;
    setEditDirty(dirty);
  }, []);
  const runOrConfirm = useCallback((action: () => void) => {
    if (editDirtyRef.current) setPendingAction(() => action);
    else action();
  }, []);
  const repNavigate = useCallback(
    (path: string) => runOrConfirm(() => navigate(path)),
    [navigate, runOrConfirm],
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 flex" dir="rtl">
      <Suspense fallback={<div className="hidden w-72 shrink-0 lg:block" />}>
        <RepSidebar
          currentPath={location.pathname}
          onNavigate={repNavigate}
          onLogout={() =>
            runOrConfirm(() => {
              logout();
              resetStockVisibility();
              navigate("/");
            })
          }
          repName={user.name}
          cartCount={totalQuantity}
        />
      </Suspense>
      <main className="flex-1 min-w-0 p-4 pt-20 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<PageRouteFallback />}>
            <PageTransition>
              <Routes>
            <Route
              path=""
              element={<RepDashboard onNavigate={repNavigate} />}
            />
            <Route
              path="products"
              element={<WholesaleProductsPage onNavigate={repNavigate} />}
            />
            <Route path="products/:id" element={<RepProductDetailsWrapper />} />
            <Route
              path="create-order"
              element={<Navigate to="/rep/orders/new" replace />}
            />
            <Route
              path="orders/new"
              element={<CreateWholesaleOrderPage onNavigate={repNavigate} />}
            />
            <Route
              path="orders"
              element={<RepOrders onNavigate={repNavigate} />}
            />
            <Route
              path="orders/:id/edit"
              element={
                <RepOrderEditWrapper
                  onNavigate={repNavigate}
                  onDirtyChange={handleEditDirtyChange}
                />
              }
            />
            <Route path="orders/:id" element={<RepOrderDetailsWrapper />} />
            <Route path="receivables" element={<RepReceivablesPage />} />
            <Route path="*" element={<Navigate to="/rep" replace />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </div>
      </main>
      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          handleEditDirtyChange(false);
          action?.();
        }}
        title="تجاهل التغييرات؟"
        message="لديك تغييرات غير محفوظة في الطلب. هل تريد مغادرة الصفحة وفقدانها؟"
        confirmLabel="مغادرة دون حفظ"
        cancelLabel="متابعة التعديل"
      />
    </div>
  );
}

function RepProductDetailsWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0)
    return <Navigate to="/rep/products" replace />;
  return (
    <WholesaleProductDetailsPage productId={productId} onNavigate={navigate} />
  );
}

function RepOrderDetailsWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);
  return Number.isInteger(orderId) && orderId > 0 ? (
    <RepOrderDetailsPage orderId={orderId} onNavigate={navigate} />
  ) : (
    <Navigate to="/rep/orders" replace />
  );
}
function RepOrderEditWrapper({
  onNavigate,
  onDirtyChange,
}: {
  onNavigate: (path: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { id } = useParams();
  const orderId = Number(id);
  return Number.isInteger(orderId) && orderId > 0 ? (
    <EditRepOrderPage
      orderId={orderId}
      onNavigate={onNavigate}
      onDirtyChange={onDirtyChange}
    />
  ) : (
    <Navigate to="/rep/orders" replace />
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
  const searchQuery = new URLSearchParams(location.search).get("search") ?? "";
  return (
    <div className="min-h-screen flex flex-col bg-stone-50" dir="rtl">
      <div className="sticky top-0 z-50 w-full max-w-full">
        <AnnouncementBar />
        <PublicHeader
          onNavigate={onNavigate}
          currentPath={location.pathname}
          onSearch={(query) =>
            navigate(
              query
                ? `/products?search=${encodeURIComponent(query)}`
                : "/products",
            )
          }
          searchQuery={searchQuery}
        />
      </div>
      {location.pathname !== "/contact" && <CompanyProfileNotice />}
      <div className="flex-1">
        <PageTransition>
          <Routes>
          <Route path="" element={<HomePage onNavigate={onNavigate} />} />
          <Route
            path="products"
            element={<ProductsPage onNavigate={onNavigate} />}
          />
          <Route
            path="products/:id"
            element={<PublicProductDetailsWrapper />}
          />
          <Route
            path="categories"
            element={<CategoriesPage onNavigate={onNavigate} />}
          />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="cart" element={<CartPage onNavigate={onNavigate} />} />
          <Route
            path="checkout"
            element={<CheckoutPage onNavigate={onNavigate} />}
          />
          <Route
            path="*"
            element={<PublicNotFoundPage onNavigate={onNavigate} />}
          />
          </Routes>
        </PageTransition>
      </div>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

function PublicProductDetailsWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0)
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center font-bold text-stone-500">
        المنتج غير متوفر حاليًا
      </div>
    );
  return (
    <ProductDetailsPage
      productId={productId}
      onBack={() => navigate("/products")}
    />
  );
}
