import InvoicesList from "@/components/orders/InvoicesList";
export default function RepOrders(props: {
  onNavigate: (path: string) => void;
}) {
  return <InvoicesList {...props} mode="representative" />;
}
