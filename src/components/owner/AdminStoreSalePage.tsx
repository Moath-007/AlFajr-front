import InvoiceEditor from "@/components/orders/InvoiceEditor";
export default function AdminStoreSalePage({
  onNavigate,
  mode,
}: {
  onNavigate: (path: string) => void;
  mode: "retail" | "wholesale";
}) {
  return (
    <InvoiceEditor mode="admin" defaultPrice={mode} onNavigate={onNavigate} />
  );
}
