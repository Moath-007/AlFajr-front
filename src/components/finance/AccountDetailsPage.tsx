import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {accountsService,type AccountFinancialDetail} from '@/api';
import {useAuth} from '@/auth/useAuth';
import {apiMessages} from '@/components/rep/repOrderUtils';
import {Balance} from './accountUi';
import {OpeningPanel} from './AccountFinancialPanels';
export default function AccountDetailsPage(){
 const {id}=useParams(),{user}=useAuth(),admin=user?.role==='Admin',base=admin?'/owner':'/rep';
 const [notice,setNotice]=useState('');
 const [data,setData]=useState<AccountFinancialDetail|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{const c=new AbortController();setError('');accountsService.financialDetail(Number(id),{},c.signal).then(d=>{if(!c.signal.aborted)setData(d)}).catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'الحساب غير موجود أو غير مسموح.').join('، '))});return()=>c.abort()},[id,admin,revision]);
 return <section dir="rtl" className="space-y-4 p-4"><Link className="text-brand underline" to={admin?'/owner/commercial-accounts':'/rep/accounts'}>الحسابات التجارية</Link><h1 className="text-2xl font-bold text-brand">تفاصيل الحساب</h1>{notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-800">{notice}</p>}{error?<p role="alert" className="rep-error">{error}</p>:!data||data.account.account_id!==Number(id)?<p role="status">جارٍ تحميل الحساب…</p>:<><div className="space-y-3 rounded-xl border bg-white p-4"><h2 className="text-xl font-bold">{data.account.name}</h2>{data.account.commercial_classification&&<p>{data.account.commercial_classification==='Customer'?'زبون':'مورد'}</p>}<bdi>{data.account.account_number}</bdi>{data.account.group&&<p>المجموعة: {data.account.group.name}</p>}{data.account.city&&<p>المدينة: {data.account.city.name}</p>}{data.account.phone&&<p>الهاتف: <bdi>{data.account.phone}</bdi></p>}{data.account.notes&&<p className="whitespace-pre-wrap">{data.account.notes}</p>}<Balance value={data.current_balance} kind={data.account.kind}/><div className="flex flex-wrap gap-3"><Link className="btn-primary" to={`${base}/accounts/${id}/statement`}>كشف الحساب والحركات والطباعة</Link>{data.account.kind==='General'&&<Link className="btn-outline" to={`${base}/vouchers?account=${id}`}>إنشاء سند للحساب</Link>}{admin&&data.account.group?.reserved_key!=='COMMERCIAL'&&data.account.group&&<Link className="btn-outline" to={'/owner/account-groups?group='+data.account.group.group_id}>فتح المجموعة</Link>}</div></div>{admin&&<OpeningPanel key={id} onFailureRefresh={()=>setRevision(r=>r+1)} onSuccess={setNotice} accountLabel={data.account.name+' · '+data.account.account_number} accountId={Number(id)} document={data.opening_balance} admin onChanged={()=>setRevision(r=>r+1)}/>}</>}
 </section>;
}
