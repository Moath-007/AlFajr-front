import InvoiceDetails from "@/components/orders/InvoiceDetails";
export default function RepOrderDetailsPage(props: {
  orderId: number;
  onNavigate: (path: string) => void;
}) {
  return <InvoiceDetails {...props} mode="representative" />;
}
