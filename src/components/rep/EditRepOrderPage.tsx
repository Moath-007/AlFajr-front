import InvoiceEditor from "@/components/orders/InvoiceEditor";
export default function EditRepOrderPage({
  orderId,
  onNavigate,
  onDirtyChange,
  mode = "representative",
}: {
  orderId: number;
  onNavigate: (path: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  mode?: "representative" | "admin";
}) {
  return (
    <InvoiceEditor
      orderId={orderId}
      mode={mode}
      defaultPrice={mode === "admin" ? "retail" : "wholesale"}
      onNavigate={onNavigate}
      onDirtyChange={onDirtyChange}
    />
  );
}
