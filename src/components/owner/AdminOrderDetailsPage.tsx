import InvoiceDetails from "@/components/orders/InvoiceDetails";
export default function AdminOrderDetailsPage(props: {
  orderId: number;
  onNavigate: (path: string) => void;
}) {
  return <InvoiceDetails {...props} mode="admin" />;
}
