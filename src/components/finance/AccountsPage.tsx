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
import { OpeningPanel } from './AccountFinancialPanels';
import { accountAmountColor } from './accountUiUtils';
import { Loader2 } from 'lucide-react';
import './AccountsPage.css';
import { useDebouncedValue } from './useDebouncedValue';
export default function AccountsPage({group,bank = false,onChanged}:{group?:{group_id:number;name:string;reserved_key:string|null};bank?:boolean;onChanged?:()=>void}={}) {
  const { user } = useAuth();

  const admin = user?.role === 'Admin';
  const base = admin ? '/owner' : '/rep';
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const settledSearch=useDebouncedValue(search);
  const type: UserAccountKind = bank && admin && !group ? 'Bank' : 'General';
  const classification=params.get('commercial_classification')??'';
  const showClassification=!bank&&(!group||group.reserved_key==='COMMERCIAL');
  const hasFilters=!!classification||!!search;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [data, setData] = useState<AccountIdentityList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{
    account: AccountIdentity | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<AccountIdentity | null>(null);
  const [notice, setNotice] = useState('');
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
      .list({ commercial_classification:showClassification&&(classification==='Customer'||classification==='Supplier')?classification:undefined, search:settledSearch, type:group?'General':type,group_id:group?.group_id, scope:group?'financial':'commercial', page, limit: 20 }, c.signal)
      .then((result) => { if (!c.signal.aborted) setData(result); })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, 'تعذر تحميل الحسابات').join('، '));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [settledSearch, type, page, revision, group,classification,showClassification]);
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
    <div dir="rtl" className={'accounts-page min-w-0 space-y-4'+(group?' accounts-page-in-group':'')}>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-800">{notice}</p>}
      <header className="flex flex-wrap items-center justify-between gap-3">
        {!group&&<div>
          <h1 className="text-2xl font-bold text-brand">{bank&&admin?'إدارة البنوك':'الحسابات التجارية'}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {bank&&admin?'هوية البنك وبياناته':'حسابات الزبائن والموردين وأرصدتهم'}
          </p>
        </div>}
        <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary"
          onClick={() => setEditor({ account: null })}
        >
          حساب جديد
        </button>
        </div>
      </header>
      <div className="accounts-filters">
        <label className="min-w-0"><span className="rep-label">بحث الحسابات</span>
        <input
          className="rep-control"
          type="search"
          placeholder="رقم الحساب أو الاسم أو الهاتف"
          value={search}
          onChange={(e) => filter('search', e.target.value)}
        />
        </label>
        {showClassification&&<fieldset className="min-w-0"><legend className="rep-label">تصنيف الحساب التجاري</legend><div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1">{[{value:'',label:'الكل'},{value:'Customer',label:'زبائن'},{value:'Supplier',label:'موردين'}].map(option=><button key={option.value} type="button" aria-pressed={classification===option.value} onClick={()=>filter('commercial_classification',option.value)} className="min-h-11 flex-1 rounded-lg px-2 text-sm font-bold text-stone-600 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold aria-pressed:bg-brand aria-pressed:text-white">{option.label}</button>)}</div></fieldset>}
        {hasFilters && <button className="btn-ghost min-h-11" onClick={()=>setParams(p=>{const n=new URLSearchParams(p);n.delete('commercial_classification');n.delete('search');n.delete('page');if(!group&&!bank)n.delete('type');return n})}>مسح الفلاتر</button>}
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
              <thead><tr><th className="account-identity" scope="col">الحساب</th><th className="account-phone" scope="col">الهاتف</th><th className="account-date" scope="col">تاريخ الإنشاء</th><th className="account-balance" scope="col">مدين</th><th className="account-balance" scope="col">دائن</th><th className="account-actions" scope="col">الإجراءات</th></tr></thead>
              <tbody>{data?.items.map(a => <AccountRow onOpeningSuccess={setNotice} key={a.account_id} account={a} admin={admin} base={base} revision={revision} onChanged={()=>{setRevision(v=>v+1);onChanged?.()}} onEdit={()=>setEditor({account:a})} onDelete={()=>setDeleting(a)} />)}</tbody>
            </table>
          </div>}
          {data?.items.length === 0 && (
            <p role="status" className="rep-section p-8 text-center text-stone-500">
              {hasFilters ? 'لا توجد حسابات مطابقة. جرّب تغيير الفلاتر.' : 'لا توجد حسابات بعد.'}
            </p>
          )}
          {data && (!group || data.pagination.total_pages > 1) && (
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
          group={group}
          fixedKind={type}
          admin={admin}
          onClose={() => setEditor(null)}
          onSaved={() => {setRevision((v) => v + 1);onChanged?.()}}
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

function AccountRow({onOpeningSuccess,account:a,admin,base,revision,onChanged,onEdit,onDelete}:{onOpeningSuccess:(message:string)=>void;account:AccountIdentity;admin:boolean;base:string;revision:number;onChanged:()=>void;onEdit:()=>void;onDelete:()=>void}) {
 const [detail,setDetail]=useState<AccountFinancialDetail|null>(null),[error,setError]=useState(''),[managing,setManaging]=useState(false);
 const permitted=admin || a.kind==='General';
 useEffect(()=>{if(!permitted)return;const c=new AbortController();setError('');accountsService.financialDetail(a.account_id,{},c.signal).then(d=>{if(!c.signal.aborted)setDetail(d)}).catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'تعذر تحميل الرصيد').join('، '))});return()=>c.abort()},[a.account_id,permitted,revision]);
 const navigate=useNavigate();
 const [menuOpen,setMenuOpen]=useState(false),[position,setPosition]=useState({top:0,left:0});
 const trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const statement=base+'/accounts/'+a.account_id+'/statement';
 useEffect(()=>{if(!menuOpen)return;const place=()=>{const r=trigger.current?.getBoundingClientRect();if(r)setPosition({left:Math.max(8,Math.min(r.right-220,innerWidth-228)),top:r.bottom+6+170>innerHeight?Math.max(8,r.top-170):r.bottom+6})};place();const outside=(e:PointerEvent)=>{if(!trigger.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setMenuOpen(false)};document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);const frame=requestAnimationFrame(()=>menu.current?.querySelector<HTMLButtonElement>('button')?.focus());return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[menuOpen]);
 return <tr className={permitted?'account-interactive-row':undefined} tabIndex={permitted?0:undefined} aria-label={permitted?'كشف حساب '+a.name:undefined} onClick={e=>{if(permitted&&!(e.target as HTMLElement).closest('a,button,input,select,textarea'))navigate(statement)}} onKeyDown={e=>{if(e.target===e.currentTarget&&permitted&&['Enter',' '].includes(e.key)){e.preventDefault();navigate(statement)}}}>
 <td data-label="الحساب" className="account-name-cell"><b className="text-brand">{a.name}</b><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500"><bdi dir="ltr" className="font-mono">{a.account_number}</bdi>{a.commercial_classification&&<span>{a.commercial_classification==='Customer'?'زبون':'مورد'}</span>}{a.kind === 'General' && a.city && <span>{a.city.name}</span>}</div>{a.notes && <p title={a.notes} className="mt-1 line-clamp-2 text-xs text-stone-500 whitespace-pre-wrap">{a.notes}</p>}</td>
 <td data-label="الهاتف"><bdi>{a.kind==='General'&&a.phone?a.phone:'—'}</bdi></td>
 <td data-label="تاريخ الإنشاء" className="text-xs text-stone-500"><bdi dir="ltr">{formatOrderDate(a.created_at)}</bdi></td>
 {(['مدين', 'دائن'] as const).map(side => {
 const amount = detail ? (side === 'مدين' ? Math.max(Number(detail.current_balance), 0) : Math.max(-Number(detail.current_balance), 0)) : 0;
 return <td key={side} className="account-balance-cell" data-label={side}>{permitted ? error ? <span className="text-xs text-red-700">{error}</span> : detail ? <b dir="ltr" className={'block ' + accountAmountColor(String(amount), side === 'مدين' ? 'debit' : 'credit')}>{formatMoney(amount)}</b> : <span className="text-xs text-stone-400">جارٍ التحميل…</span> : '—'}</td>;
 })}
 <td data-label="الإجراءات" className="account-actions-cell" onClick={e=>e.stopPropagation()}>{permitted ? <div className="account-row-actions"><Link className="btn-outline" to={statement}>كشف الحساب</Link><button className="btn-ghost" onClick={onEdit}>تعديل</button><button ref={trigger} className="account-more" aria-label={'المزيد من الإجراءات · '+a.name} aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>⋯</button></div> : <span className="text-xs text-stone-400">بيانات الحساب فقط</span>}
 {menuOpen && createPortal(<div ref={menu} role="menu" aria-label={'إجراءات '+a.name} dir="rtl" className="account-action-menu" style={position} onClick={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){setMenuOpen(false);trigger.current?.focus()}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')??[]);const index=items.indexOf(document.activeElement as HTMLButtonElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}}}><button role="menuitem" onClick={()=>{setMenuOpen(false);setManaging(true)}}>الرصيد الافتتاحي</button>{admin && <button role="menuitem" className="account-menu-delete" onClick={()=>{setMenuOpen(false);onDelete()}}>حذف الحساب</button>}</div>,document.body)}
 {managing && <Modal open onClose={()=>setManaging(false)} title={'الرصيد الافتتاحي · '+a.name} size="lg">{error ? <p role="alert">{error}</p> : detail ? <div className="space-y-3"><OpeningPanel onFailureRefresh={()=>{void accountsService.financialDetail(a.account_id).then(setDetail).catch(e=>setError(apiMessages(e).join('، ')));}} onSuccess={onOpeningSuccess} accountLabel={a.name+' · '+a.account_number} accountId={a.account_id} document={detail.opening_balance} admin={admin} onChanged={onChanged}/></div> : <p role="status">جارٍ تحميل البيانات…</p>}</Modal>}
 </td></tr>;
}
