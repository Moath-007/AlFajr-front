import { useState, useEffect, useMemo } from 'react';
import {
    ArrowRight, Phone, Weight, Ruler, Palette, Boxes, Tag, ShoppingBag, Check,
    Trash2, Plus, Minus, X, CheckCircle, AlertCircle, Building2, Layers,
    User, MapPin, ChevronLeft, ZoomIn,
} from 'lucide-react';
import type { Product, Category, SizeOption, ColorOption, Variant } from '@/types';
import { formatPrice } from '@/utils/helpers';

interface WholesaleProductDetailsPageProps {
    product: Product;
    category?: Category;
    onNavigate: (page: string, params?: Record<string, string>) => void;
    onBack: () => void;
    onAddToCart?: (product: Product, quantity: number, selectedColor?: string, selectedSize?: string, finalPrice?: number) => void;
}

interface CartItem {
    product: Product;
    quantity: number;
    selectedColor?: string;
    selectedSize?: string;
    price: number;
}

// كميات جاهزة للطلب السريع (شائعة في طلبات الجملة/الكراتين)
const QUICK_QUANTITIES = [6, 12, 24, 48];

export default function WholesaleProductDetailsPage({
                                                        product,
                                                        category,
                                                        onNavigate,
                                                        onBack,
                                                        onAddToCart,
                                                    }: WholesaleProductDetailsPageProps) {
    // معالجة الصور بأمان
    const productImages = product?.images;
    const images: string[] = Array.isArray(productImages) && productImages.length > 0
        ? productImages
        : [product?.image || 'https://via.placeholder.com/600'];

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [stockError, setStockError] = useState('');

    // جلب قائمة المقاسات والألوان والمتغيرات
    const sizesList: SizeOption[] = useMemo(() => product?.sizes || [], [product]);
    const colorsList: ColorOption[] = useMemo(() => product?.colors || [], [product]);
    const variantsList: Variant[] = useMemo(() => product?.variants || [], [product]);

    const [selectedSize, setSelectedSize] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<string>('');

    // تحديد القيم الافتراضية عند تحميل المنتج أو تغييره
    useEffect(() => {
        if (sizesList && sizesList.length > 0) {
            setSelectedSize(sizesList[0].size || '');
        } else {
            setSelectedSize('');
        }

        if (colorsList && colorsList.length > 0) {
            setSelectedColor(colorsList[0].name || '');
        } else {
            setSelectedColor('');
        }
        setQuantity(1);
        setStockError('');
        setActiveImageIndex(0);
    }, [product, sizesList, colorsList]);

    // إعادة ضبط الكمية إلى 1 عند تغير المقاس أو اللون
    useEffect(() => {
        setQuantity(1);
        setStockError('');
    }, [selectedSize, selectedColor]);

    // حساب سعر الجملة الحالي بناءً على المقاس المختار
    const getCurrentWholesalePrice = () => {
        const baseWsPrice = product?.wholesalePrice || product?.price || 0;
        if (!sizesList || sizesList.length === 0) return baseWsPrice;

        const found = sizesList.find((s) => String(s.size) === String(selectedSize));
        return found ? (found.price || baseWsPrice) : baseWsPrice;
    };

    const currentPrice = getCurrentWholesalePrice();

    // جلب المخزون بدقة بناءً على المقاس واللون المختارين من مصفوفة variants
    const getCurrentVariantStock = () => {
        if (!variantsList || variantsList.length === 0) {
            return 99; // افتراضي في حال عدم وجود متغيرات دقيقة
        }
        const variant = variantsList.find(
            (v) => String(v.size) === String(selectedSize) && String(v.color) === String(selectedColor)
        );
        return variant ? variant.stock : 0;
    };

    const currentStock = getCurrentVariantStock();

    // إجمالي المخزون لمقاس معين، بجمع الكمية عبر كل الألوان المتاحة لهذا المقاس
    const getSizeStock = (size: string) => {
        if (!variantsList || variantsList.length === 0) return null;
        return variantsList
            .filter((v) => String(v.size) === String(size))
            .reduce((sum, v) => sum + (v.stock || 0), 0);
    };

    // مخزون لون معين ضمن المقاس المختار حالياً
    const getColorStockForSize = (color: string) => {
        if (!variantsList || variantsList.length === 0) return null;
        return variantsList
            .filter((v) => String(v.size) === String(selectedSize) && String(v.color) === String(color))
            .reduce((sum, v) => sum + (v.stock || 0), 0);
    };

    // تحديد حالة المخزون للعرض
    const getStockStatus = () => {
        if (currentStock === 0) return 'out';
        if (currentStock <= 5) return 'limited';
        return 'available';
    };

    const stockLevel = getStockStatus();
    const stockDotClass = stockLevel === 'out' ? 'bg-red-500' : stockLevel === 'limited' ? 'bg-gold' : 'bg-green-500';
    const stockTextClass = stockLevel === 'out' ? 'text-red-600' : stockLevel === 'limited' ? 'text-gold-dark' : 'text-green-600';

    const [addedSuccess, setAddedSuccess] = useState(false);
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

    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('wholesale_store_cart');
            if (savedCart) {
                setCart(JSON.parse(savedCart));
            }
        } catch (e) {
            console.error(e);
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

    const handleIncrementQuantity = () => {
        if (quantity < currentStock) {
            setQuantity(quantity + 1);
            setStockError('');
        } else {
            setStockError('عذراً، الكمية المطلوبة للجملة تتجاوز المتاح في المخزون.');
        }
    };

    const handleQuickQuantity = (n: number) => {
        if (n > currentStock) return;
        setQuantity(n);
        setStockError('');
    };

    const handleAddToCart = () => {
        if (currentStock === 0) return;

        const existingCartItem = cart.find(
            (item) => item.product.id === product.id && item.selectedColor === selectedColor && item.selectedSize === selectedSize
        );
        const currentCartQty = existingCartItem ? existingCartItem.quantity : 0;

        if (currentCartQty + quantity > currentStock) {
            setStockError('عذراً، الكمية الإجمالية في السلة تتجاوز المخزون المتاح.');
            return;
        }

        if (onAddToCart) {
            onAddToCart(product, quantity, selectedColor, selectedSize, currentPrice);
        }

        updateCartAndStorage((prev) => {
            const cartIndex = prev.findIndex(
                (item) => item.product.id === product.id && item.selectedColor === selectedColor && item.selectedSize === selectedSize
            );

            if (cartIndex > -1) {
                const updated = [...prev];
                updated[cartIndex].quantity += quantity;
                updated[cartIndex].price = currentPrice;
                return updated;
            }
            return [...prev, { product, quantity, selectedColor, selectedSize, price: currentPrice }];
        });

        setAddedSuccess(true);
        setStockError('');
        setTimeout(() => setAddedSuccess(false), 2000);
    };

    const updateCartQuantity = (productId: string, size: string, color: string, delta: number) => {
        let maxAllowedStock = 99;
        if (variantsList && variantsList.length > 0) {
            const v = variantsList.find(item => String(item.size) === String(size) && String(item.color) === String(color));
            if (v) maxAllowedStock = v.stock;
        }

        updateCartAndStorage((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId && item.selectedSize === size && item.selectedColor === color) {
                        const newQty = item.quantity + delta;
                        if (delta > 0 && newQty > maxAllowedStock) {
                            return item;
                        }
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const removeFromCart = (productId: string, size: string, color: string) => {
        updateCartAndStorage((prev) => prev.filter((item) => !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price || item.product.wholesalePrice || item.product.price || 0) * item.quantity, 0);
    const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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

    const availableQuickQuantities = QUICK_QUANTITIES.filter((n) => n <= currentStock);

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-6 animate-fade-in relative" dir="rtl">
            {/* شريط تنقل علوي مع مسار (Breadcrumb) وزر السلة */}
            <div className="flex items-center justify-between mb-6 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={onBack}
                        className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:text-brand hover:border-gold transition bg-white"
                        aria-label="رجوع"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-stone-400 min-w-0 truncate">
                        <span className="hover:text-brand cursor-pointer transition" onClick={onBack}>منتجات الجملة</span>
                        {category?.name && (
                            <>
                                <ChevronLeft className="h-3 w-3 shrink-0" />
                                <span className="text-stone-500">{category.name}</span>
                            </>
                        )}
                        <ChevronLeft className="h-3 w-3 shrink-0" />
                        <span className="text-brand truncate">{product?.name}</span>
                    </div>
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

            <div className="grid md:grid-cols-2 gap-8">
                {/* صور المنتج */}
                <div className="flex flex-col gap-3">
                    <div className="card overflow-hidden aspect-square bg-stone-100 relative shadow-md group cursor-zoom-in">
                        <img
                            src={images[activeImageIndex] || images[0]}
                            alt={product?.name || 'product'}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute top-4 right-4 flex flex-col gap-1">
                            <span className="badge-gold !px-3 !py-1.5 shadow flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" /> سعر جملة
                            </span>
                        </div>
                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                            <span className={`shadow rounded-full bg-white/95 backdrop-blur px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${stockTextClass}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${stockDotClass}`} />
                                {stockLevel === 'out' ? 'غير متوفر' : stockLevel === 'limited' ? `كمية محدودة: ${currentStock}` : `متوفر: ${currentStock}`}
                            </span>
                        </div>
                        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition">
                            <span className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow">
                                <ZoomIn className="h-4 w-4 text-stone-500" />
                            </span>
                        </div>
                    </div>

                    {images.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImageIndex(idx)}
                                    className={`shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition ${
                                        activeImageIndex === idx
                                            ? 'border-gold ring-2 ring-gold/30 shadow-md'
                                            : 'border-stone-200 opacity-70 hover:opacity-100 hover:border-stone-300'
                                    }`}
                                    aria-label={`عرض الصورة رقم ${idx + 1}`}
                                >
                                    <img src={img} alt="" className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* تفاصيل وخيارات المنتج */}
                <div className="card p-6 bg-white shadow-sm border border-stone-100 flex flex-col justify-between">
                    <div>
                        <div className="text-sm text-gold font-bold mb-1">{category?.name}</div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-brand leading-tight">{product?.name}</h1>
                        <div className="mt-2 flex items-center gap-3 text-sm text-stone-500">
                            <span className="flex items-center gap-1"><Tag className="h-4 w-4"/> كود المنتج: <strong className="text-brand">{product?.code}</strong></span>
                        </div>

                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-gold tabular-nums">
                                {formatPrice ? formatPrice(currentPrice) : currentPrice}
                            </span>
                            <span className="text-xs text-stone-400">للطلب التجاري / الجملة</span>
                        </div>

                        <p className="mt-4 text-stone-600 leading-relaxed text-sm sm:text-base">{product?.description}</p>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-3">
                                <Weight className="h-5 w-5 text-gold shrink-0"/>
                                <div>
                                    <div className="text-xs text-stone-400">الوزن</div>
                                    <div className="text-sm font-bold text-brand">{product?.weight || 'غير محدد'}</div>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-3">
                                <Boxes className={`h-5 w-5 shrink-0 ${stockTextClass}`}/>
                                <div>
                                    <div className="text-xs text-stone-400">حالة المخزون</div>
                                    <div className={`text-sm font-bold ${stockTextClass}`}>
                                        {stockLevel === 'out' ? 'غير متوفر' : `${currentStock} قطعة متوفرة`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* خيارات المقاسات */}
                        {sizesList && sizesList.length > 0 && (
                            <div className="mt-6">
                                <h3 className="label flex items-center gap-1 mb-2 font-bold text-brand"><Ruler className="h-4 w-4"/> اختر المقاس التجاري</h3>
                                <div className="flex flex-wrap gap-2">
                                    {sizesList.map((s, idx) => {
                                        const isSelected = String(selectedSize) === String(s.size);
                                        const sizeStock = getSizeStock(s.size);
                                        const isSizeOut = sizeStock === 0;
                                        return (
                                            <button
                                                key={s.size || idx}
                                                type="button"
                                                onClick={() => setSelectedSize(s.size)}
                                                disabled={isSizeOut}
                                                title={isSizeOut ? 'هذا المقاس غير متوفر حالياً بجميع الألوان' : undefined}
                                                className={`relative px-4 py-2 text-sm font-bold rounded-xl border transition-all flex flex-col items-center gap-0.5 ${
                                                    isSelected
                                                        ? 'bg-brand text-white border-brand shadow-md scale-[1.03]'
                                                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-gold hover:-translate-y-0.5'
                                                } ${isSizeOut ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:border-stone-200' : ''}`}
                                            >
                                                {isSelected && (
                                                    <span className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full bg-gold flex items-center justify-center shadow">
                                                        <Check className="h-2.5 w-2.5 text-white" />
                                                    </span>
                                                )}
                                                <span>{s.size}</span>
                                                <span className={`text-xs ${isSelected ? 'text-gold-light' : 'text-gold'}`}>
                                                    {formatPrice ? formatPrice(s.price) : s.price}
                                                </span>
                                                {sizeStock !== null && (
                                                    <span className={`text-[10px] ${isSelected ? 'text-white/80' : isSizeOut ? 'text-red-500' : 'text-stone-400'}`}>
                                                        {isSizeOut ? 'غير متوفر' : `متوفر ${sizeStock}`}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* خيارات الألوان */}
                        {colorsList && colorsList.length > 0 && (
                            <div className="mt-5">
                                <h3 className="label flex items-center gap-1 mb-2 font-bold text-brand"><Palette className="h-4 w-4"/> اختر اللون</h3>
                                <div className="flex flex-wrap gap-2">
                                    {colorsList.map((c) => {
                                        const colorStock = getColorStockForSize(c.name);
                                        const isColorOut = colorStock === 0;
                                        const isSelected = selectedColor === c.name;
                                        return (
                                            <button
                                                key={c.name}
                                                type="button"
                                                onClick={() => setSelectedColor(c.name)}
                                                disabled={isColorOut}
                                                title={isColorOut ? 'هذا اللون غير متوفر لهذا المقاس' : undefined}
                                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${
                                                    isSelected
                                                        ? 'bg-brand text-white border-brand shadow-md scale-[1.03]'
                                                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-gold hover:-translate-y-0.5'
                                                } ${isColorOut ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:border-stone-200' : ''}`}
                                            >
                                                <span
                                                    className={`h-4 w-4 rounded-full border shadow-inner flex items-center justify-center ${isSelected ? 'border-white/60' : 'border-stone-300'}`}
                                                    style={{ backgroundColor: c.hex }}
                                                >
                                                    {isSelected && <Check className="h-2.5 w-2.5" style={{ color: c.hex === '#f5f5f5' || c.hex === '#e8e8e8' ? '#1a1a1a' : '#fff' }} />}
                                                </span>
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-bold">{c.name}</span>
                                                    {colorStock !== null && (
                                                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : isColorOut ? 'text-red-500' : 'text-stone-400'}`}>
                                                            {isColorOut ? 'غير متوفر' : `متوفر ${colorStock}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* اختيار الكمية */}
                        <div className="mt-6">
                            <div className="flex items-center gap-4">
                                <span className="label mb-0 font-bold text-brand">الكمية المطلوبة:</span>
                                <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (quantity > 1) {
                                                setQuantity(quantity - 1);
                                                setStockError('');
                                            }
                                        }}
                                        className="px-3.5 py-2 text-stone-600 hover:bg-stone-200 font-bold transition"
                                        aria-label="إنقاص الكمية"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-12 text-center font-bold text-brand tabular-nums">{quantity}</span>
                                    <button
                                        type="button"
                                        onClick={handleIncrementQuantity}
                                        className="px-3.5 py-2 text-stone-600 hover:bg-stone-200 font-bold transition"
                                        aria-label="زيادة الكمية"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* كميات جاهزة لطلبات الجملة (كراتين شائعة) */}
                            {availableQuickQuantities.length > 0 && (
                                <div className="mt-3 flex items-center flex-wrap gap-2">
                                    <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                                        <Layers className="h-3.5 w-3.5" /> اختيار سريع:
                                    </span>
                                    {availableQuickQuantities.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => handleQuickQuantity(n)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                                                quantity === n
                                                    ? 'bg-gold border-gold text-white'
                                                    : 'bg-white border-stone-200 text-stone-600 hover:border-gold hover:text-gold'
                                            }`}
                                        >
                                            {n} قطعة
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {stockError && (
                            <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs font-bold animate-shake">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{stockError}</span>
                            </div>
                        )}
                    </div>

                    {/* أزرار الإجراء - سطح المكتب */}
                    <div className="mt-8 hidden lg:flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={currentStock === 0}
                            className={`btn flex-1 !py-3 text-base flex items-center justify-center gap-2 transition-all shadow-md ${
                                addedSuccess
                                    ? 'bg-green-600 text-white'
                                    : 'bg-brand text-white hover:bg-brand-dark'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {addedSuccess ? (
                                <>
                                    <Check className="h-5 w-5"/>
                                    تمت الإضافة لسلة الجملة بنجاح
                                </>
                            ) : currentStock === 0 ? (
                                'غير متوفر بهذا الاختيار'
                            ) : (
                                <>
                                    <ShoppingBag className="h-5 w-5"/>
                                    إضافة لسلة الجملة
                                </>
                            )}
                        </button>

                        <button type="button" onClick={() => onNavigate('contact')} className="btn-outline !py-3 flex items-center justify-center gap-2">
                            <Phone className="h-5 w-5 text-gold"/>
                            استفسار تجاري
                        </button>
                    </div>
                </div>
            </div>

            {/* شريط إجراء ثابت أسفل الشاشة على الجوال */}
            <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-stone-200 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center gap-3">
                <div className="shrink-0">
                    <div className="text-[10px] text-stone-400">السعر</div>
                    <div className="text-lg font-extrabold text-gold leading-none">{formatPrice ? formatPrice(currentPrice) : currentPrice}</div>
                </div>
                <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={currentStock === 0}
                    className={`btn flex-1 !py-3 text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                        addedSuccess ? 'bg-green-600 text-white' : 'bg-brand text-white hover:bg-brand-dark'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {addedSuccess ? (
                        <><Check className="h-4 w-4"/> تمت الإضافة</>
                    ) : currentStock === 0 ? (
                        'غير متوفر'
                    ) : (
                        <><ShoppingBag className="h-4 w-4"/> إضافة لسلة الجملة</>
                    )}
                </button>
            </div>

            {/* سلة تسوق الجملة الجانبية */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex justify-end animate-fade-in">
                    <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
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
                                    <p className="text-xs mt-1">أضف منتجات لتجهيز طلب جملة جديد</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => {
                                    const lineTotal = (item.price || item.product.wholesalePrice || item.product.price || 0) * item.quantity;
                                    return (
                                        <div key={idx} className="flex gap-3 items-center border-b border-stone-100 pb-3">
                                            <img src={item.product?.image} alt={item.product?.name} className="w-16 h-16 object-cover rounded-xl bg-stone-100 shrink-0 shadow-sm" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-brand line-clamp-1">{item.product?.name}</h4>
                                                <div className="text-xs text-stone-400">
                                                    {item.selectedColor && `لون: ${item.selectedColor} `}
                                                    {item.selectedSize && `مقاس: ${item.selectedSize}`}
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <span className="text-xs text-gold font-bold">
                                                        {formatPrice ? formatPrice(item.price) : item.price}
                                                    </span>
                                                    <span className="text-xs font-extrabold text-brand">
                                                        {formatPrice ? formatPrice(lineTotal) : lineTotal}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button type="button" onClick={() => updateCartQuantity(item.product.id, item.selectedSize || '', item.selectedColor || '', -1)} className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600">
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="text-sm font-bold w-6 text-center tabular-nums">{item.quantity}</span>
                                                    <button type="button" onClick={() => updateCartQuantity(item.product.id, item.selectedSize || '', item.selectedColor || '', 1)} className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600">
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
                                    className="w-full btn bg-brand text-white hover:bg-brand-dark py-3 rounded-xl font-bold shadow-md"
                                >
                                    إتمام طلب الجملة التجاري
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* نموذج إتمام طلب الجملة (الشركات والمعارض) */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-fade-in">
                        <button type="button" onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 left-4 text-stone-400 hover:text-stone-600">
                            <X className="h-5 w-5" />
                        </button>

                        {orderSubmitted ? (
                            <div className="text-center py-10">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
                                <h3 className="text-xl font-bold text-brand mb-2">تم اعتماد طلب الجملة بنجاح!</h3>
                                <p className="text-stone-500 text-sm">شكراً لشراكتك معنا، سيقوم قسم المبيعات التجارية بالتواصل معك لتأكيد الفاتورة وترتيب الشحن.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleCheckoutSubmit} className="space-y-4" noValidate>
                                <h3 className="text-xl font-bold text-brand mb-2">معلومات الشركة / المعرض التجاري</h3>
                                <p className="text-xs text-stone-500 mb-4">يرجى تعبئة الحقول لتجهيز الفاتورة التجارية وشحن البضاعة.</p>

                                <div>
                                    <label className="label flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-gold" /> اسم الشركة / المعرض</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="اسم المؤسسة التجارية"
                                        className={`input ${formTouched && !companyName ? 'border-red-400 focus:ring-red-200' : ''}`}
                                    />
                                    {formTouched && !companyName && <p className="text-[11px] text-red-500 mt-1">هذا الحقل مطلوب</p>}
                                </div>

                                <div>
                                    <label className="label flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-gold" /> اسم المسؤول للتواصل</label>
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="اسم الشخص المسؤول"
                                        className={`input ${formTouched && !contactName ? 'border-red-400 focus:ring-red-200' : ''}`}
                                    />
                                    {formTouched && !contactName && <p className="text-[11px] text-red-500 mt-1">هذا الحقل مطلوب</p>}
                                </div>

                                <div>
                                    <label className="label flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gold" /> رقم الهاتف التجاري</label>
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
                                        placeholder="المدينة، المنطقة، الشارع..."
                                        className={`input ${formTouched && !customerAddress ? 'border-red-400 focus:ring-red-200' : ''}`}
                                    />
                                    {formTouched && !customerAddress && <p className="text-[11px] text-red-500 mt-1">هذا الحقل مطلوب</p>}
                                </div>

                                <div className="bg-stone-50 p-3 rounded-xl flex justify-between items-center my-4">
                                    <span className="text-sm font-bold text-stone-600">الإجمالي التجاري المطلوب:</span>
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
                                        تأكيد طلب الجملة النهائي
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
