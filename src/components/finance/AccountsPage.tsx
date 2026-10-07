import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  accountsService,
  type AccountIdentity,
  type AccountFinancialDetail,
  type AccountIdentityList,
  type UserAccountKind,
} from '@/api';
import { useAuth } from '@/auth/useAuth';
import { apiMessages, formatOrderDate, formatMoney } from '@/components/rep/repOrderUtils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { AccountIdentityEditor, Pager } from './accountUi';
import Modal from '@/components/ui/Modal';
import { OpeningPanel, DiscountPanel } from './AccountFinancialPanels';
import { accountKindLabels } from './accountUiUtils';
import Select from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import './AccountsPage.css';
export default function AccountsPage() {
  const { user } = useAuth();

  const admin = user?.role === 'Admin';
  const base = admin ? '/owner' : '/rep';
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const type = (params.get('type') ?? 'All') as 'All' | UserAccountKind;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [data, setData] = useState<AccountIdentityList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{
    account: AccountIdentity | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<AccountIdentity | null>(null);
  const [busy, setBusy] = useState(false);
  function filter(key: string, value: string) {
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set(key, value);
      if (key !== 'page') n.set('page', '1');
      return n;
    });
  }
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    accountsService
      .list({ search, type, page, limit: 20 }, c.signal)
      .then((result) => { if (!c.signal.aborted) setData(result); })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, 'تعذر تحميل الحسابات').join('، '));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [search, type, page, revision]);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await accountsService.remove(deleting.account_id);
      setDeleting(null);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(apiMessages(e).join('، '));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div dir="rtl" className="accounts-page min-w-0 space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand">الحسابات</h1>
          <p className="mt-1 text-sm text-stone-500">
            الحسابات العامة والصناديق والبنوك
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setEditor({ account: null })}
        >
          حساب جديد
        </button>
      </header>
      <div className="rep-section grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end">
        <label className="min-w-0"><span className="rep-label">بحث الحسابات</span>
        <input
          className="rep-control"
          aria-label="بحث الحسابات"
          placeholder="رقم الحساب أو الاسم أو الهاتف"
          value={search}
          onChange={(e) => filter('search', e.target.value)}
        />
        </label>
        <Select label="نوع الحساب" value={type} onChange={(value) => filter('type',value)} options={[{value:'All',label:'كل الأنواع'},...Object.entries(accountKindLabels).map(([value,label])=>({value,label}))]} />
        {(search || type !== 'All') && <button className="btn-ghost min-h-11" onClick={()=>setParams({})}>مسح الفلاتر</button>}
      </div>
      {error && (
        <p role="alert" className="rep-error flex flex-wrap items-center gap-3">
          {error}
          <button className="btn-outline" onClick={()=>setRevision(v=>v+1)}>إعادة المحاولة</button>
        </p>
      )}
      {loading ? (
        <p role="status" className="rep-section flex min-h-48 items-center justify-center gap-2 p-6 text-sm text-stone-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          جارٍ تحميل الحسابات…
        </p>
      ) : error ? null : (
        <>
          {Boolean(data?.items.length) && <div className="rep-section overflow-hidden">
            <table className="accounts-table" aria-label="الحسابات">
              <thead><tr><th className="account-number" scope="col">رقم الحساب</th><th scope="col">الاسم</th><th className="account-kind" scope="col">النوع</th><th className="account-phone" scope="col">الهاتف</th><th className="account-date" scope="col">تاريخ الإنشاء</th><th className="account-balance" scope="col">مدين</th><th className="account-balance" scope="col">دائن</th><th className="account-actions" scope="col">الإجراءات</th></tr></thead>
              <tbody>{data?.items.map(a => <AccountRow key={a.account_id} account={a} admin={admin} base={base} revision={revision} onChanged={()=>setRevision(v=>v+1)} onEdit={()=>setEditor({account:a})} onDelete={()=>setDeleting(a)} />)}</tbody>
            </table>
          </div>}
          {data?.items.length === 0 && (
            <p role="status" className="rep-section p-8 text-center text-stone-500">
              {search || type !== 'All' ? 'لا توجد حسابات مطابقة. جرّب تغيير الفلاتر.' : 'لا توجد حسابات بعد.'}
            </p>
          )}
          {data && (
            <Pager
              floating
              page={page}
              pages={data.pagination.total_pages}
              total={data.pagination.total}
              onPage={(p) => filter('page', String(p))}
            />
          )}
        </>
      )}
      {editor && (
        <AccountIdentityEditor
          account={editor.account}
          admin={admin}
          onClose={() => setEditor(null)}
          onSaved={() => setRevision((v) => v + 1)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        severity="destructive"
        title="حذف الحساب"
        message={`هل تريد حذف ${deleting?.name ?? ''}؟ الحذف متاح فقط للحساب الذي ليس له أي تاريخ مالي أو حركة مرتبطة.`}
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function AccountRow({account:a,admin,base,revision,onChanged,onEdit,onDelete}:{account:AccountIdentity;admin:boolean;base:string;revision:number;onChanged:()=>void;onEdit:()=>void;onDelete:()=>void}) {
 const [detail,setDetail]=useState<AccountFinancialDetail|null>(null),[error,setError]=useState(''),[managing,setManaging]=useState(false);
 const permitted=admin || a.kind==='General';
 useEffect(()=>{if(!permitted)return;const c=new AbortController();setError('');accountsService.financialDetail(a.account_id,{},c.signal).then(d=>{if(!c.signal.aborted)setDetail(d)}).catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'تعذر تحميل الرصيد').join('، '))});return()=>c.abort()},[a.account_id,permitted,revision]);
 const navigate=useNavigate();
 const [menuOpen,setMenuOpen]=useState(false),[position,setPosition]=useState({top:0,left:0});
 const trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const statement=base+'/accounts/'+a.account_id+'/statement';
 useEffect(()=>{if(!menuOpen)return;const place=()=>{const r=trigger.current?.getBoundingClientRect();if(r)setPosition({left:Math.max(8,Math.min(r.right-220,innerWidth-228)),top:r.bottom+6+170>innerHeight?Math.max(8,r.top-170):r.bottom+6})};place();const outside=(e:PointerEvent)=>{if(!trigger.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setMenuOpen(false)};document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);const frame=requestAnimationFrame(()=>menu.current?.querySelector<HTMLButtonElement>('button')?.focus());return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[menuOpen]);
 return <tr className={permitted?'account-interactive-row':undefined} tabIndex={permitted?0:undefined} aria-label={permitted?'كشف حساب '+a.name:undefined} onClick={e=>{if(permitted&&!(e.target as HTMLElement).closest('a,button,input,select,textarea'))navigate(statement)}} onKeyDown={e=>{if(e.target===e.currentTarget&&permitted&&['Enter',' '].includes(e.key)){e.preventDefault();navigate(statement)}}}>
 <td data-label="رقم الحساب"><bdi className="font-mono text-xs text-stone-500">{a.account_number}</bdi></td>
 <td data-label="الاسم" className="account-name-cell"><b className="text-brand">{a.name}</b>{a.notes && <p className="mt-1 text-xs text-stone-500 whitespace-pre-wrap">{a.notes}</p>}</td>
 <td data-label="النوع"><span className="rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-600">{accountKindLabels[a.kind]}</span></td>
 <td data-label="الهاتف"><bdi>{a.kind==='General'&&a.phone?a.phone:'—'}</bdi></td>
 <td data-label="تاريخ الإنشاء" className="text-xs text-stone-500">{formatOrderDate(a.created_at)}</td>
 {(['مدين', 'دائن'] as const).map(side => <td key={side} className="account-balance-cell" data-label={side}>{permitted ? error ? <span className="text-xs text-red-700">{error}</span> : detail ? <b dir="ltr" className="block text-brand">{formatMoney(side === 'مدين' ? Math.max((a.kind === 'General' ? -1 : 1) * Number(detail.current_balance), 0) : Math.max((a.kind === 'General' ? 1 : -1) * Number(detail.current_balance), 0))}</b> : <span className="text-xs text-stone-400">جارٍ التحميل…</span> : '—'}</td>)}
 <td data-label="الإجراءات" className="account-actions-cell" onClick={e=>e.stopPropagation()}>{permitted ? <div className="account-row-actions"><Link className="btn-outline" to={statement}>كشف الحساب</Link><button className="btn-ghost" onClick={onEdit}>تعديل</button><button ref={trigger} className="account-more" aria-label={'المزيد من الإجراءات · '+a.name} aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>⋯</button></div> : <span className="text-xs text-stone-400">بيانات الحساب فقط</span>}
 {menuOpen && createPortal(<div ref={menu} role="menu" aria-label={'إجراءات '+a.name} dir="rtl" className="account-action-menu" style={position} onClick={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){setMenuOpen(false);trigger.current?.focus()}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')??[]);const index=items.indexOf(document.activeElement as HTMLButtonElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}}}><button role="menuitem" onClick={()=>{setMenuOpen(false);setManaging(true)}}>الافتتاحي والخصومات</button>{admin && <button role="menuitem" className="account-menu-delete" onClick={()=>{setMenuOpen(false);onDelete()}}>حذف الحساب</button>}</div>,document.body)}
 {managing && <Modal open onClose={()=>setManaging(false)} title={'الرصيد الافتتاحي والخصومات · '+a.name} size="lg">{error ? <p role="alert">{error}</p> : detail ? <div className="space-y-3"><OpeningPanel accountId={a.account_id} document={detail.opening_balance} admin={admin} onChanged={onChanged}/>{a.kind==='General' && <DiscountPanel accountId={a.account_id} onChanged={onChanged}/>}</div> : <p role="status">جارٍ تحميل البيانات…</p>}</Modal>}
 </td></tr>;
}
