import { useEffect, useState } from 'react';
import { customersService, type CustomerSelectionDto } from '@/api';
import { formatMoney } from '@/utils/money';

export default function CustomerPicker({ value, onChange }: { value: CustomerSelectionDto | null; onChange: (value: CustomerSelectionDto | null) => void }) {
  const [search, setSearch] = useState(''); const [items, setItems] = useState<CustomerSelectionDto[]>([]); const [balance, setBalance] = useState<string | null>(null);
  useEffect(() => { const c = new AbortController(); customersService.list({ page: 1, limit: 30, search: search.trim() || undefined }, c.signal).then((r) => setItems(r.customers)).catch(() => setItems([])); return () => c.abort(); }, [search]);
  useEffect(() => { if (!value) { setBalance(null); return; } const c = new AbortController(); customersService.findByPhone(value.phone, c.signal).then((r) => setBalance(r.customer.balance)).catch(() => setBalance(null)); return () => c.abort(); }, [value]);
  return <div className="space-y-2"><label className="block text-sm font-bold text-brand">الجهة</label><input className="rep-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الهاتف" /><select className="rep-control" value={value?.customer_id ?? ''} onChange={(event) => onChange(items.find((item) => item.customer_id === Number(event.target.value)) ?? null)}><option value="">اختر الجهة</option>{value && !items.some((item) => item.customer_id === value.customer_id) && <option value={value.customer_id}>{value.name} · {value.phone}</option>}{items.map((item) => <option key={item.customer_id} value={item.customer_id}>{item.name} · {item.phone} · #{item.customer_id}</option>)}</select>{value && <p className="text-xs text-stone-600">{value.name} · {value.phone}{balance !== null && <> · {Number(balance) > 0 ? 'مستحق لنا' : Number(balance) < 0 ? 'مستحق للجهة' : 'متوازن'}: <b>{formatMoney(Math.abs(Number(balance)))}</b></>}</p>}</div>;
}
