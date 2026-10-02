import InvoicesList from "@/components/orders/InvoicesList";
export default function AdminOrdersPage(props: {
  onNavigate: (path: string) => void;
}) {
  return <InvoicesList {...props} mode="admin" />;
}
