import { useState, useMemo, useEffect } from 'react';
import {
    Search, SlidersHorizontal, X, PackageSearch, ShoppingBag, Trash2, Plus, Minus,
    CheckCircle, ChevronRight, ChevronLeft, Building2, User, Phone, MapPin,
} from 'lucide-react';
import type { Product, Category } from '@/types';
import { formatPrice } from '@/utils/helpers';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import CustomSelect from '@/components/ui/Select.tsx';

interface WholesaleProductsPageProps {
    products?: Product[];
    categories?: Category[];
    onSelectProduct?: (product: Product) => void;
    initialSearch?: string;
    initialCategoryId?: string;
}
interface CartItem {
    product: Product;
    quantity: number;
    selectedColor?: string;
    selectedSize?: string;
    price?: number;
}

export default function WholesaleProductsPage({
                                                  products = [],
                                                  categories = [],
                                                  onSelectProduct,
                                                  initialSearch = '',
                                                  initialCategoryId = '',
                                              }: WholesaleProductsPageProps) {
    const [search, setSearch] = useState(initialSearch);
    const [categoryId, setCategoryId] = useState(initialCategoryId);
    const [color, setColor] = useState('');
    const [size, setSize] = useState('');
    const [sort, setSort] = useState('default');
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(true);

    // حالات التنقل بين الصفحات (Pagination)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 9;

    // حالات سلة الجملة وعملية الشراء
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // بيانات نموذج طلب الجملة (للشركات والمعارض)
    const [companyName, setCompanyName] = useState('');
    const [contactName, setContactName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [orderSubmitted, setOrderSubmitted] = useState(false);
    const [formTouched, setFormTouched] = useState(false);

    const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);
    const safeCategories = useMemo(() => Array.isArray(categories) ? categories : [], [categories]);

    useEffect(() => {
        setSearch(initialSearch);
        setCategoryId(initialCategoryId);
    }, [initialSearch, initialCategoryId]);

    // العودة للصفحة الأولى عند تغيير الفلاتر أو البحث
    useEffect(() => {
        setCurrentPage(1);
        setLoading(true);
        const t = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(t);
    }, [search, categoryId, color, size, sort]);

    // مزامنة سلة الجملة من الـ LocalStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('wholesale_store_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const updateCartAndStorage = (newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
        setCart((prev) => {
            const updated = typeof newCart === 'function' ? newCart(prev) : newCart;
            try {
                localStorage.setItem('wholesale_store_cart', JSON.stringify(updated));
            } catch (e) {
                console.error(e);
            }
            return updated;
        });
    };

    const allColors = useMemo(() => {
        const set = new Set<string>();
        safeProducts.forEach((p) => {
            if (Array.isArray(p.colors)) {
                p.colors.forEach((c) => {
                    const colorName = c.name;
                    if (colorName) set.add(colorName);
                });
            }
        });
        return Array.from(set);
    }, [safeProducts]);

    const allSizes = useMemo(() => {
        const set = new Set<string>();
        safeProducts.forEach((p) => {
            if (Array.isArray(p.sizes)) {
                p.sizes.forEach((s) => {
                    if (s && s.size) {
                        set.add(String(s.size));
                    }
                });
            }
        });
        return Array.from(set);
    }, [safeProducts]);

    // إجمالي مخزون المنتج عبر كل المتغيرات (لعرض شارة التوفر على البطاقة)
    const getProductTotalStock = (p: Product): number | null => {
        if (!Array.isArray(p.variants) || p.variants.length === 0) return null;
        return p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    };

    const filtered = useMemo(() => {
        let result = safeProducts.filter((p) => {
            const nameMatch = p?.name?.toLowerCase().includes(search.toLowerCase()) || false;
            const codeMatch = p?.code?.toLowerCase().includes(search.toLowerCase()) || false;
            if (search && !nameMatch && !codeMatch) return false;
            if (categoryId && p.categoryId !== categoryId) return false;

            if (color) {
                const hasColor = Array.isArray(p.colors) && p.colors.some((c) => {
                    const cName = c.name;
                    return cName === color;
                });
                if (!hasColor) return false;
            }

            if (size) {
                const hasSize = Array.isArray(p.sizes) && p.sizes.some((s) => {
                    return s && String(s.size) === String(size);
                });
                if (!hasSize) return false;
            }

            return true;
        });

        const getWsPrice = (item: Product) => item.wholesalePrice || item.price || 0;

        if (sort === 'price-asc') result = [...result].sort((a, b) => getWsPrice(a) - getWsPrice(b));
        if (sort === 'price-desc') result = [...result].sort((a, b) => getWsPrice(b) - getWsPrice(a));
        if (sort === 'name') result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        return result;
    }, [safeProducts, search, categoryId, color, size, sort]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    const activeFilters = [categoryId, color, size].filter(Boolean).length;

    const clearFilters = () => {
        setCategoryId('');
        setColor('');
        setSize('');
        setSort('default');
    };

    // أرقام صفحات مختصرة مع نقاط حذف عندما تكون الصفحات كثيرة
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = new Set<number>([1, 2, totalPages - 1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
        return Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    }, [totalPages, currentPage]);

    const updateQuantity = (productId: string, sizeName: string, colorName: string, delta: number) => {
        updateCartAndStorage((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId && item.selectedSize === sizeName && item.selectedColor === colorName) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const removeFromCart = (productId: string, sizeName: string, colorName: string) => {
        updateCartAndStorage((prev) => prev.filter((item) => !(item.product.id === productId && item.selectedSize === sizeName && item.selectedColor === colorName)));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.price || item.product.wholesalePrice || item.product.price || 0) * item.quantity, 0);
    }, [cart]);

    const totalItemsCount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    const handleCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormTouched(true);
        if (!companyName || !contactName || !customerPhone || !customerAddress) return;

        setOrderSubmitted(true);
        setTimeout(() => {
            updateCartAndStorage([]);
            setOrderSubmitted(false);
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
            setFormTouched(false);
            setCompanyName('');
            setContactName('');
            setCustomerPhone('');
            setCustomerAddress('');
        }, 3000);
    };

    const FilterPanel = (
        <div className="space-y-5">
            <div>
                <label className="label">التصنيف</label>
                <CustomSelect
                    value={categoryId}
                    onChange={setCategoryId}
                    options={[
                        { value: '', label: 'الكل' },
                        ...safeCategories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                />
            </div>

            <div>
                <label className="label">اللون</label>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setColor('')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                            !color ? 'bg-brand text-white border-brand' : 'bg-white border-stone-300 text-stone-600 hover:border-brand'
                        }`}
                    >
                        الكل
                    </button>
                    {allColors.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                color === c ? 'bg-brand text-white border-brand' : 'bg-white border-stone-300 text-stone-600 hover:border-brand'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="label">المقاس</label>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSize('')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                            !size ? 'bg-brand text-white border-brand' : 'bg-white border-stone-300 text-stone-600 hover:border-brand'
                        }`}
                    >
                        الكل
                    </button>
                    {allSizes.map((s) => (
                        <button
                            key={s}
                            onClick={() => setSize(s)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                                size === s ? 'bg-brand text-white border-brand' : 'bg-white border-stone-300 text-stone-600 hover:border-brand'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in relative" dir="rtl">
            {/* شريط العنوان وزر السلة */}
            <div className="flex items-center justify-between mb-6 gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="badge-gold flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> قسم الجملة والشركات
                        </span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-brand">منتجات الجملة</h1>
                    <p className="text-stone-500 mt-1 text-sm">تصفح تشكيلتنا المخصصة للبيع التجاري والمعارض بأسعار الجملة</p>
                </div>

                <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative btn bg-brand text-white hover:bg-brand-dark flex items-center gap-2 px-4 py-2 shrink-0"
                >
                    <ShoppingBag className="h-5 w-5" />
                    <span className="hidden sm:inline">سلة الجملة</span>
                    {totalItemsCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-gold text-brand font-bold text-xs h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-fade-in">
                            {totalItemsCount}
                        </span>
                    )}
                </button>
            </div>

            {/* شريط البحث والترتيب */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحث عن منتج جملة بالاسم أو الكود..."
                        className="input pr-10 pl-9"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            aria-label="مسح البحث"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <CustomSelect
                    className="sm:w-48"
                    value={sort}
                    onChange={setSort}
                    options={[
                        { value: 'default', label: 'الترتيب الافتراضي' },
                        { value: 'price-asc', label: 'السعر: من الأقل للأعلى' },
                        { value: 'price-desc', label: 'السعر: من الأعلى للأقل' },
                        { value: 'name', label: 'الاسم: أبجدياً' },
                    ]}
                />

                <button
                    onClick={() => setShowFilters(true)}
                    className="btn-outline lg:hidden flex items-center justify-center gap-2 relative"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    فلترة
                    {activeFilters > 0 && <span className="badge-gold !py-0.5 !px-1.5">{activeFilters}</span>}
                </button>
            </div>

            {/* رقائق الفلاتر النشطة */}
            {activeFilters > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {categoryId && (
                        <button onClick={() => setCategoryId('')} className="flex items-center gap-1.5 bg-brand-50 text-brand text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition">
                            {safeCategories.find((c) => c.id === categoryId)?.name || 'تصنيف'} <X className="h-3 w-3" />
                        </button>
                    )}
                    {color && (
                        <button onClick={() => setColor('')} className="flex items-center gap-1.5 bg-brand-50 text-brand text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition">
                            اللون: {color} <X className="h-3 w-3" />
                        </button>
                    )}
                    {size && (
                        <button onClick={() => setSize('')} className="flex items-center gap-1.5 bg-brand-50 text-brand text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand hover:text-white transition">
                            المقاس: {size} <X className="h-3 w-3" />
                        </button>
                    )}
                    <button onClick={clearFilters} className="text-xs text-gold hover:text-gold-dark font-bold flex items-center gap-1 mr-1">
                        مسح الكل
                    </button>
                </div>
            )}

            <div className="grid lg:grid-cols-[260px_1fr] gap-6">
                {/* الفلاتر الجانبية - سطح المكتب */}
                <aside className="hidden lg:block">
                    <div className="card p-5 sticky top-20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-brand">فلاتر الجملة</h3>
                            {activeFilters > 0 && (
                                <button onClick={clearFilters} className="text-xs text-gold hover:text-gold-dark font-bold flex items-center gap-1">
                                    <X className="h-3 w-3" /> مسح الكل
                                </button>
                            )}
                        </div>
                        {FilterPanel}
                    </div>
                </aside>

                {/* عرض المنتجات */}
                <div>
                    <div className="mb-4 text-sm text-stone-500">
                        {loading ? 'جاري التحميل...' : filtered.length === 0 ? 'لا توجد نتائج' : `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} من إجمالي ${filtered.length} منتج جملة`}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon={<PackageSearch className="h-8 w-8" />}
                            title="لا توجد منتجات جملة مطابقة"
                            description="جرّب تغيير الفلاتر أو كلمة البحث"
                            action={<button onClick={clearFilters} className="btn-outline">مسح الفلاتر</button>}
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {paginatedProducts.map((p) => {
                                    const cat = safeCategories.find((c) => c.id === p.categoryId);
                                    const productImage = p.image || (Array.isArray(p.images) && p.images[0]) || 'https://via.placeholder.com/400';
                                    const wsPrice = p.wholesalePrice || p.price || 0;
                                    const totalStock = getProductTotalStock(p);
                                    const isOut = totalStock === 0;
                                    const isLimited = totalStock !== null && totalStock > 0 && totalStock <= 10;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => {
                                                if (typeof onSelectProduct === 'function') {
                                                    onSelectProduct(p);
                                                } else {
                                                    console.warn('onSelectProduct is not provided');
                                                }
                                            }}
                                            className={`card overflow-hidden text-right group hover:shadow-cardHover hover:border-gold/40 hover:-translate-y-1 transition-all flex flex-col cursor-pointer bg-white ${isOut ? 'opacity-70' : ''}`}
                                        >
                                            <div className="relative aspect-square overflow-hidden bg-stone-100">
                                                <img
                                                    src={productImage}
                                                    alt={p.name}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                                                    loading="lazy"
                                                />
                                                <div className="absolute top-2 right-2 flex flex-col gap-1">
                                                    <span className="badge-gold shadow flex items-center gap-1 text-[10px]">
                                                        <Building2 className="h-3 w-3" /> جملة
                                                    </span>
                                                </div>
                                                {totalStock !== null && (
                                                    <div className="absolute bottom-2 left-2">
                                                        <span className={`shadow rounded-full bg-white/95 backdrop-blur px-2 py-1 text-[10px] font-bold flex items-center gap-1 ${
                                                            isOut ? 'text-red-600' : isLimited ? 'text-gold-dark' : 'text-green-600'
                                                        }`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${isOut ? 'bg-red-500' : isLimited ? 'bg-gold' : 'bg-green-500'}`} />
                                                            {isOut ? 'نفذ المخزون' : isLimited ? `كمية محدودة` : 'متوفر'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 sm:p-4 flex flex-col flex-1">
                                                <div className="text-xs text-stone-400 mb-1">{cat?.name}</div>
                                                <h3 className="font-bold text-brand text-sm sm:text-base line-clamp-2 leading-snug">{p.name}</h3>
                                                <div className="text-xs text-stone-500 mt-1">الكود: {p.code}</div>
                                                <div className="mt-auto pt-3 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] text-stone-400 block">سعر الجملة</span>
                                                        <span className="text-lg font-extrabold text-gold tabular-nums">{formatPrice ? formatPrice(wsPrice) : wsPrice}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-brand bg-brand-50 px-2.5 py-1 rounded-lg group-hover:bg-gold group-hover:text-white transition">
                                                        عرض التفاصيل
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* أزرار ترقيم الصفحات (Pagination Controls) */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
                                    <button
                                        onClick={() => {
                                            setCurrentPage((prev) => Math.max(prev - 1, 1));
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        disabled={currentPage === 1}
                                        className="btn-outline px-3 py-2 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                        السابق
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {pageNumbers.map((pageNum, idx) => {
                                            const prevNum = pageNumbers[idx - 1];
                                            const showEllipsis = prevNum !== undefined && pageNum - prevNum > 1;
                                            return (
                                                <span key={pageNum} className="flex items-center gap-1">
                                                    {showEllipsis && <span className="text-stone-300 px-1">…</span>}
                                                    <button
                                                        onClick={() => {
                                                            setCurrentPage(pageNum);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className={`w-9 h-9 rounded-xl font-bold text-sm transition ${
                                                            currentPage === pageNum
                                                                ? 'bg-brand text-white shadow'
                                                                : 'bg-white border border-stone-200 text-stone-600 hover:border-gold'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        disabled={currentPage === totalPages}
                                        className="btn-outline px-3 py-2 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        التالي
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* لوحة الفلاتر المنبثقة على الجوال */}
            {showFilters && (
                <div className="fixed inset-0 z-50 lg:hidden bg-black/50 flex justify-end animate-fade-in">
                    <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-brand text-white">
                            <h2 className="font-bold flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5" /> فلاتر الجملة
                            </h2>
                            <button type="button" onClick={() => setShowFilters(false)} className="text-white hover:text-stone-300">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">{FilterPanel}</div>
                        <div className="p-4 border-t border-stone-200 flex gap-3">
                            <button onClick={clearFilters} className="btn-outline flex-1">مسح الكل</button>
                            <button onClick={() => setShowFilters(false)} className="btn bg-brand text-white hover:bg-brand-dark flex-1">
                                عرض {filtered.length} نتيجة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* سلة تسوق الجملة الجانبية */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex justify-end animate-fade-in">
                    <div className="w-full max-w-md bg-white h-full shadow-xl flex flex-col">
                        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-brand text-white">
                            <h2 className="font-bold flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5" /> سلة الجملة ({totalItemsCount})
                            </h2>
                            <button type="button" onClick={() => setIsCartOpen(false)} className="text-white hover:text-stone-300">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-16 text-stone-400">
                                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p className="font-bold">سلة الجملة فارغة حالياً</p>
                                    <p className="text-xs mt-1">تصفح المنتجات وأضف ما يناسب طلبك</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => {
                                    const lineTotal = (item.price || item.product.wholesalePrice || item.product.price || 0) * item.quantity;
                                    return (
                                        <div key={idx} className="flex gap-3 items-center border-b border-stone-100 pb-3">
                                            <img src={item.product?.image} alt={item.product?.name} className="w-16 h-16 object-cover rounded-lg bg-stone-100 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-brand line-clamp-1">{item.product?.name}</h4>
                                                <div className="text-xs text-stone-400">
                                                    {item.selectedColor && `لون: ${item.selectedColor} `}
                                                    {item.selectedSize && `مقاس: ${item.selectedSize}`}
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <span className="text-xs text-gold font-bold">
                                                        {formatPrice(item.price || item.product.wholesalePrice || item.product.price || 0)}
                                                    </span>
                                                    <span className="text-xs font-extrabold text-brand">
                                                        {formatPrice ? formatPrice(lineTotal) : lineTotal}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button type="button" onClick={() => updateQuantity(item.product.id, item.selectedSize || '', item.selectedColor || '', -1)} className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600">
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="text-sm font-bold w-6 text-center tabular-nums">{item.quantity}</span>
                                                    <button type="button" onClick={() => updateQuantity(item.product.id, item.selectedSize || '', item.selectedColor || '', 1)} className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600">
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeFromCart(item.product.id, item.selectedSize || '', item.selectedColor || '')} className="text-stone-400 hover:text-red-500 p-2 transition">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-4 border-t border-stone-200 bg-stone-50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-stone-500">عدد القطع الإجمالي</span>
                                    <span className="text-xs font-bold text-brand">{totalItemsCount}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-stone-600">المجموع الكلي للجملة:</span>
                                    <span className="text-xl font-extrabold text-gold tabular-nums">{formatPrice ? formatPrice(cartTotal) : cartTotal}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCheckoutOpen(true)}
                                    className="w-full btn bg-brand text-white hover:bg-brand-dark py-3 rounded-xl font-bold"
                                >
                                    إتمام طلب الجملة
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* نموذج إتمام طلب الجملة (خاص بالشركات والتجار) */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-fade-in">
                        <button type="button" onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 left-4 text-stone-400 hover:text-stone-600">
                            <X className="h-5 w-5" />
                        </button>

                        {orderSubmitted ? (
                            <div className="text-center py-10">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
                                <h3 className="text-xl font-bold text-brand mb-2">تم إرسال طلب الجملة بنجاح!</h3>
                                <p className="text-stone-500 text-sm">شكراً لتعاملكم معنا، سيقوم قسم المبيعات التجارية بالتواصل معك لتأكيد الفاتورة والشحن.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCheckoutSubmit} className="space-y-4" noValidate>
                                <h3 className="text-xl font-bold text-brand mb-2">معلومات الشركة / المعرض</h3>
                                <p className="text-xs text-stone-500 mb-4">يرجى إدخال تفاصيل الجهة التجارية لإتمام طلب الجملة.</p>

                                <div>
                                    <label className="label flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-gold" /> اسم الشركة / المعرض</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="مثال: شركة النور للتجارة"
                                        className={`input ${formTouched && !companyName ? 'border-red-400 focus:ring-red-200' : ''}`}
                                    />
                                    {formTouched && !companyName && <p className="text-[11px] text-red-500 mt-1">هذا الحقل مطلوب</p>}
                                </div>

                                <div>
                                    <label className="label flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-gold" /> اسم المسؤول / الشخص المراجع</label>
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="اسم المسؤول"
                                        className={`input ${formTouched && !contactName ? 'border-red-400 focus:ring-red-200' : ''}`}
                                    />
                                    {formTouched && !contactName && <p className="text-[11px] text-red-500 mt-1">هذا الحقل مطلوب</p>}
                                </div>

                                <div>
                                    <label className="label flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gold" /> رقم الهاتف (للتواصل)</label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="0500000000"
                                        className={`input ${formTouched && !customerPhone ? 'border-red-400 focus:ring-red-200' : ''}`}
                                    />
                                    {formTouched && !customerPhone && <p className="text-[11px] text-red-500 mt-1">هذا الحقل مطلوب</p>}
                                </div>

                                <div>
                                    <label className="label flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gold" /> عنوان المستودع أو المعرض بالتفصيل</label>
                                    <textarea
                                        rows={3}
                                        value={customerAddress}
                                        onChange={(e) => setCustomerAddress(e.target.value)}
                                        placeholder="المدينة، المنطقة الصناعية، الشارع..."
                                        className={`input ${formTouched && !customerAddress ? 'border-red-400 focus:ring-red-200' : ''}`}
                                    />
                                    {formTouched && !customerAddress && <p className="text-[11px] text-red-500 mt-1">هذا الحقل مطلوب</p>}
                                </div>

                                <div className="bg-stone-50 p-3 rounded-xl flex justify-between items-center my-4">
                                    <span className="text-sm font-bold text-stone-600">إجمالي طلب الجملة:</span>
                                    <span className="text-lg font-extrabold text-gold tabular-nums">{formatPrice ? formatPrice(cartTotal) : cartTotal}</span>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCheckoutOpen(false)}
                                        className="btn-outline flex-1"
                                    >
                                        رجوع للسلة
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn bg-brand text-white hover:bg-brand-dark flex-1"
                                    >
                                        اعتماد طلب الجملة
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
