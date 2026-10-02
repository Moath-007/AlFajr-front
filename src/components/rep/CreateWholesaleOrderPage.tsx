import InvoiceEditor from "@/components/orders/InvoiceEditor";
import { useWholesaleCart } from "@/rep";
export default function CreateWholesaleOrderPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { items, clearCart } = useWholesaleCart();
  return (
    <InvoiceEditor
      mode="representative"
      defaultPrice="wholesale"
      onNavigate={onNavigate}
      onCreated={clearCart}
      initialItems={items.map((i) => ({
        product_variant_id: i.product_variant_id,
        quantity: i.quantity,
        label: `${i.product_name} — ${i.size} — ${i.color}`,
        stock: i.last_known_stock,
        price: i.display_price,
        discount: i.display_discount,
        bonus: false,
      }))}
    />
  );
}
