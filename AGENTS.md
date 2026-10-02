# ALFAJR — Codex working reference

## نطاق المرجع

- يصف هذا الملف الكود المحلي الحالي فقط. المرجع عند العمل: أحدث تعليمات صريحة من المستخدم، ثم التنفيذ الحالي في services/controllers/DTOs/schema والواجهة. لا تحول ملاحظات أو تعليقات قديمة إلى قواعد عمل.
- لا يتوفر هنا سجل قرارات محادثة Work السابقة أو نقطة توقف Manual QA مؤكدة. لا تدّعِ مراجعتها أو اعتماد قواعد غير موثقة. عند تعارض مهم مع تعليمات مستخدم مؤكدة، اعرضه قبل أي تغيير.
- المستندات المؤرخة في backend/docs تقارير سابقة وليست عقدًا بديلًا للكود الحالي. لا تستخدم النسخ الاحتياطية أو migrations_archive أو scripts/archive كمصدر للتنفيذ الحالي.

## آخر تحديث Accounts — Part 3، 2026-10-02

- النموذج الحالي لا يحتوي Customer كهوية أعمال أو جدول أو API. General هو الطرف المباشر للبيع والشراء والمردود والدفعات. أي وصف Customer/Party قديم أدناه يوثق الحالة السابقة ولا يعلو على هذا التحديث أو الكود الحالي.
- هوية الحساب عبر /accounts و/accounts/options: General/Cash/Bank، رقم ACC موحد ثابت، اسم فريد بعد trim وبلا حساسية للحالة، هاتف اختياري لـGeneral وملاحظات. المندوب ينشئ/يعدل General فقط؛ الحذف Admin ويمنع عند أي تاريخ مالي، حتى لو الرصيد صفر.
- بيع داخلي Completed يحتاج General غير system. جهة التواصل contact_text اختيارية مستقلة. الطلب العام Pending يستقبل name/phone/notes ويجمعها في contact_text، بلا إنشاء هوية؛ التأكيد Admin وباختيار General صريح.
- مسارات المشتريات الحالية /purchases؛ الشراء ومردوده والدفعات يعتمدون account_id، بلا دفعات مرتبطة بالشراء. module الخلفية src/purchases والواجهة components/purchases. source_type/الجداول customer_purchases وcustomer_returns ومعرفات البنود باقية لتجنب تغيير مصادر inventory/cost/ledger، وليست هوية Customer.
- Customer/debts/WriteOff والواجهات والمسارات القديمة أزيلت. Discount وOpening الحاليان عبر AccountFinancialService وبنفس lifecycle/permissions/audit المعتمدين.
- QA الوحيدة لهذه المرحلة alfajr_accounts_runtime_qa_20261002، مستعادة من Accounts Financial QA. هجرة 20261002050000_direct_account_runtime تشترط القطع النظيف أولًا؛ لا تطبقها على المصدر تلقائيًا.
- القطع حذف التاريخ المالي/المعاملات وجميع 52 مستند Opening/Discount قديمًا؛ حفظ stock/average لكل Variant في baseline ثابت قبل حذف cost events القديمة. لا reset للـACC sequence. النسخة الأصلية alfajrdb وProduction لم تُغيّرا.
- المرجع النهائي للنتائج: backend/docs/ACCOUNTS_PART3_COMPLETE_2026-10-02.md. لا يبدأ Manual UI QA تلقائيًا.

## آخر تحديث Accounts UI & Statement — 2026-10-02

- قائمة /owner/accounts و/rep/accounts موحدة General/Cash/Bank بالهوية والبحث/النوع/pagination، بلا أرصدة. المندوب لا يدير Cash/Bank ولا يحذف الحسابات.
- /accounts/:id في الواجهة للتفاصيل، و/accounts/:id/statement للكشف. API الحالي /accounts/:id/financial-details و/statement يدعم الفترة؛ القراءة RepeatableRead، current_balance إجمالي مستقل، opening_balance في الكشف هو المرحّل قبل الفترة. رصيد الصف يحسب زمنيًا قبل فلتر النوع والصفحات، ثم يعرض الأحدث أولًا. الأصل/العكس للمستندات المالية يحتفظ به وفق الإسقاط الفعال المعتمد.
- واجهة Opening للمدير إنشاء/تعديل الفعال/إلغاء، صفر صالح، لا Restore. خصم General للدورين باتجاه صريح، إنشاء/تعديل/إلغاء/حذف وفق lifecycle الحالي. المصادر الحقيقية تفتح في تبويب جديد وفق صلاحية وحدتها؛ الطباعة للصفحة الحالية فقط وبالفلاتر نفسها.
- تحقق على alfajr_accounts_runtime_qa_20261002 فقط: 188 اختبار Backend، 113 مجموعة PostgreSQL مختلفة، 9 مجموعات متصفح Accounts بما فيها الهاتف وPDF؛ الفحوص الآلية ناجحة. حفظ 44 Variant/907 و368 Variant/2765 والحالة الحالية للتكلفة والكتالوج و43 uploads والهويات والإعدادات. لا migration/cutover جديد ولا المصدر/Production/نشر.
- التقرير: [Accounts UI & Statement](C:/Users/dweer/Desktop/alfajr-backend/alfajr-backend/docs/ACCOUNTS_UI_STATEMENT_COMPLETE_2026-10-02.md). الحالة READY FOR REVIEW؛ لا تعني اكتمال Manual QA الشاملة للوحدات الأخرى.

## آخر تحديث Final Business Modules — 2026-10-02

- اكتملت مراجعة/تكامل Payments/Vouchers وChecks وPurchases/PurchaseReturns وReports/Dashboard وAuth/Representatives/Settings على QA المعزولة `alfajr_accounts_runtime_qa_20261002` فقط. القرار الصريح الأحدث للشيك الصادر: مدين General ودائن Bank عند الإصدار فورًا؛ CLEARED حالة فقط بلا قيد إضافي؛ الإرجاع/التراجع يعكس/يعيد أثر الإصدار مرة واحدة. لا حساب مؤجل للصادر.
- السند النقدي من الواجهة يستخدم PaymentsService ويحفظ original amount/currency/rate/base snapshot. تصحيح Cash يعكس الأصل ويُنشئ Payment بديلًا؛ تعديل الشيك عبر ChecksService. المندوب يقبض ويختار هوية Cash/Bank دون تفاصيل مالية؛ الصرف والقيد اليدوي وإدارة الشيكات/التقارير Admin حسب الصلاحيات الحالية.
- التجيير إلى General لا يفحص كفاية رصيد المستفيد؛ مدين المستفيد ودائن CheckHolding مع عكس صحيح. بيانات الشيك الوارد التعريفية وملاحظة السند تتعدل في TREASURY فقط؛ التصحيح المالي الصريح يحتفظ بالعكس/repost والتاريخ.
- أضيف purchase_date بهجرة مستقلة `20261002060000_purchase_business_date` على QA فقط. قائمة /purchases مرقمة وبحث/فلاتر/إجماليات لكل المطابقات؛ التاريخ التجاري مستقل عن cost sequence. أقفال variants مرتبة للشراء ومردوده. CostService/Orders/SalesReturn لم تعاد هندستها.
- /reports/purchases و/disbursements من القيود وعكوسها؛ Collections يتتبع reversal-of-reversal وحساب القيد الأصلي. أزيلت بطاقة WriteOff والـledger identity mutation aliases؛ إدارة الهوية عبر /accounts، وOpening عبر AccountFinancial فقط. التنقل الحالي DashboardHeader؛ الـSidebars القديمة بلا callers أزيلت. أسماء مصادر cost/journal والجداول التاريخية باقية كمعرفات تقنية وليست Customer runtime.
- النهائي: 191 اختبار Backend/27 ملفًا، 31 مجموعة PostgreSQL جديدة +113 انحدار =144، و8 مجموعات متصفح جديدة +9 Accounts =17 PASS. Prisma validate/generate وtypecheck/build/lint وdiff check ناجحة؛ Frontend lint بلا أخطاء مع3 تحذيرات Seo موجودة. فشل rollback count أثناء تشغيل متصفح متزامن عولج بإعادة الانحدار منفردًا دون إضعاف التأكيد.
- الحفظ الحالي لكل صف قبل المهمة في15 جدولًا PASS، مع566 Variant وcost/events/layers والهويات والمستخدمين/config و43 uploads. كذلك44/44 الأصلية بإجمالي907 و368/368 القطع بإجمالي2765 محفوظة؛ ACC597→1031 بفجوات fixtures بلا reset. المصدر/Production لم يلمسا؛ لا نشر/commit/push ولا Manual QA بشرية شاملة.
- التقرير [Final Business Modules](C:/Users/dweer/Desktop/alfajr-backend/alfajr-backend/docs/FINAL_BUSINESS_MODULES_COMPLETE_2026-10-02.md). الحالة FINAL BUSINESS MODULES COMPLETE — READY FOR SYSTEM AUDIT.

## المشروع والبنية الحالية

متجر عربي مع كتالوج وسلة وطلبات عامة، لوحة Admin، لوحة Representative، مخزون ومشتريات ومردودات، حسابات وقيود وسندات وشيكات وتقارير.

- Frontend root: `C:/Users/dweer/Desktop/Alfajr-front`؛ React 18، TypeScript، Vite 5، React Router 7، Tailwind 3، lucide-react، ESLint 9. مشروع SPA، وalias `@` يشير إلى `src`.
- Backend root الفعلي: `C:/Users/dweer/Desktop/alfajr-backend/alfajr-backend`؛ NestJS 12، TypeScript 6، Prisma 7 مع adapter-pg، PostgreSQL، JWT، Swagger، Vitest 4، oxlint، Sharp.
- `alfajr-backend - Copy` ليس الخلفية المستخدمة. المشروعان لهما package.json ومستودع Git مستقلان؛ شغّل الأوامر من الجذر الصحيح. هذا الملف في مستودع الواجهة؛ اقرأه صراحة عند العمل في المستودع الشقيق.
- Frontend: `src/App.tsx` للمسارات، `src/api/{client,types,services}` لعقد API، `src/auth` للجلسة، `src/public` و`src/rep` و`src/store` للحالة، `src/components/{public,owner,rep,finance,customers,customer-purchases,orders,ui}` للواجهات.
- Backend: `src/<feature>` يحتوي controller/service/DTO/module واختبارات `.spec.ts`؛ أبرز الوحدات orders/inventory/ledger/payments/checks/returns/customer-purchases/customers/reports/auth/audit. `src/common` للمال والتواريخ وidempotency، `prisma` للبنية والهجرات، `scripts` للفحوص المحلية، `uploads` بيانات صور حية.

## التشغيل والتحقق

استخدم Node.js وnpm المتوافقين مع dependencies الموجودة؛ لا يوجد engines يثبت إصدار Node في package.json. لا تعيد تثبيت أو ترقية الاعتماديات دون حاجة للمهمة.

| المكان | أوامر package.json الفعلية |
| --- | --- |
| Frontend | `npm install`، `npm run dev`، `npm run typecheck`، `npm run lint`، `npm run build`، `npm run preview` |
| Backend | `npm install`، `npm run start:dev`، `npm run build`، `npm run lint`، `npm test`، `npm run test:watch`، `npm run test:cov` |

- Frontend لا يحتوي test script. build لا ينفذ typecheck؛ شغّله مستقلًا. Backend لا يحتوي typecheck script؛ `npm run build` هو فحص البناء المتاح. يمكن فحص TypeScript مباشرة بـ`npx tsc --noEmit -p tsconfig.json` عند الحاجة، وليس كـnpm script موجود.
- Backend يتطلب `DATABASE_URL` و`JWT_SECRET` محليين؛ `PORT` اختياري، الافتراضي 6164. Frontend يستخدم `VITE_API_BASE_URL`، والافتراضي `http://127.0.0.1:6164`. لا تنسخ قيم الأسرار إلى وثائق أو logs.
- Swagger المحلي `/api` وOpenAPI `/api-json`؛ لا توجد بادئة `/api` لكل endpoints. الصور تحت `/uploads/`.
- افحص العمليات والمنافذ الحالية قبل تشغيل نسخة إضافية أو إيقاف أي process. لا تفترض أن process موجود يستخدم أحدث build.
- Vitest يلتقط `.spec.ts`. فحوص PostgreSQL/HTTP في `scripts/test-*-local.mjs` وغيرها ليست ضمن `npm test`، وبعضها ينشئ ويعدل ويحذف بيانات ويشغل backend. اقرأ السكربت كاملًا وتحقق من قاعدة QA معزولة ومصرح بها قبل تشغيله؛ localhost وحده لا يضمن أنها قاعدة اختبار.
- `npm run format` يكتب الملفات، و`npm run images:optimize-existing` يغير الصور؛ لا تعتبرهما فحوصًا للقراءة فقط.

## قاعدة البيانات وPrisma

- `prisma7.config.ts` يحدد `prisma/schema.prisma` و`prisma/migrations` وseed عبر `scripts/seed-local.mjs`. العميل مولد في `src/generated/prisma`؛ لا تعدّل الملفات المولدة يدويًا.
- أوامر دون تعديل قاعدة البيانات: `npx prisma validate --config prisma7.config.ts`، وتوليد العميل عند الحاجة بـ`npx prisma generate --config prisma7.config.ts`.
- تغييرات schema والهجرات تحتاج طلبًا صريحًا؛ لا تعدل migration مطبقة، ولا تستخدم `db push` أو reset أو إعادة baseline أو restore أو scripts cutover كحل تلقائي. الهجرات النشطة فقط في `prisma/migrations`.
- `npx prisma migrate deploy --config prisma7.config.ts` يغير قاعدة البيانات. ليس خطوة تحقق عادية؛ يلزم تفويض واضح وتحقق من الهدف والنسخة الاحتياطية. لا تشغّل seed تلقائيًا.
- حافظ على معاملات Prisma والأقفال وقيود التكامل: القيد والحركة المخزنية وسجل المصدر والعكس يجب أن تلتزم أو تتراجع معًا. حافظ على idempotency في المسارات التي تستعمل `once`؛ نفس المفتاح والطلب يعيدان النتيجة، ومحتوى مختلف لنفس المفتاح يرفض.

## الأدوار والتفويض

- الأدوار المستخدمة `Admin` و`Representative`؛ الزائر يستطيع الكتالوج والطلبات العامة دون حساب.
- التفويض الحقيقي في Backend: `JwtAuthGuard` و`RolesGuard` ثم شروط service. قيود العرض في الواجهة أو إخفاء زر لا تمنح تفويضًا. معرف actor/representative يؤخذ من JWT حيث يطبق ذلك.
- Admin يدير المنتجات والتصنيفات والمناديب والمخزون والتكاليف والحسابات والسندات والشيكات والتقارير وaudit وملف الشركة، ويؤكد الطلبات العامة.
- Admin وRepresentative ينشئان فاتورة بيع موحدة ويقرآن جميع الفواتير دون شرط نوع أو ملكية. كلاهما يعدل Completed ويلغي ويحذف نهائيًا؛ Admin وحده يعدل Pending ويؤكده. إحصائيات /orders/my اختيارية حسب created_by وليست قيد صلاحية.
- Representative يستطيع إدارة بيانات الزبائن وقراءة كشوفهم، تسجيل قبض زبون وقراءة الدفعات، وقراءة المشتريات والعملات. SalesReturn متاح للدورين لجميع المستندات والعمليات دون ملكية؛ PurchaseReturn كتابة وإلغاء Admin فقط، والقراءة للدورين. الصرف وتعديل/إلغاء الدفعات وكتابة المشتريات Admin فقط.
- `/ledger/sale-accounts` متاح للدورين ويرجع أسماء ومعرفات فقط؛ بقية إدارة ledger Admin. إدارة managed-checks وتقارير reports وaudit Admin.
- لا تفترض أن إخفاء المخزون للمندوب بكلمة مرور في الواجهة يعني منع API من إعادة الكميات؛ راجع endpoint نفسه. لا تغير آلية المصادقة أو تخزين كلمات المرور ضمن مهمة أخرى دون طلب.

## الطلبات والفواتير — النموذج المعتمد 2026-10-01

- نموذج واحد بلا order_type أو representative_id أو discounted_by أو base_unit_price. Retail/Wholesale اختيارات أسعار افتراضية في الواجهة فقط؛ /orders للإنشاء المكتمل، و/orders/online للطلب العام المعلق.
- كل فاتورة Completed تحتاج sale_account_id صريحًا General أو Party غير system. customer_id مرجع اختياري منفصل لا يغير الحساب ولا ينشئ Party تلقائيًا؛ contact_name/contact_phone/contact_email تحفظ جهة التواصل، وcreated_by يحفظ المنشئ من JWT.
- سعر الوحدة وخصم الوحدة محفوظان صراحة؛ إجمالي البنود = (unit_price - product_discount) × quantity، ثم خصم الفاتورة. السعر العادي صفر مسموح، والبونص سعره وخصمه صفر. يسمح بسطر عادي وسطر Bonus لنفس variant، ويرفض تكرار (variant_id,is_bonus). فاتورة صفرية وبونص فقط صحيحان.
- الكميات صحيحة موجبة، ونقص المخزون إلى قيمة سالبة مسموح. جميع كميات Completed، بما فيها البونص، تخصم المخزون. Pending لا يحجز أو يخصم ولا يرحل قيدًا.
- العام ينشئ Pending بأسعار الكتالوج من Backend. Admin يعدل جميع محتوياته ثم يؤكد عبر POST /orders/:id/confirm بحساب صريح؛ يتم التحقق من البنود المخزنة وإجماليها قبل الخصم والترحيل.
- Admin وRepresentative يريان جميع الفواتير، وينشئان ويعدلان Completed ويلغيان ويحذفان نهائيًا دون ملكية. Cancelled لا يعدل، وRepresentative لا يعدل Pending ولا يؤكده.
- التعديل يبدأ من أسعار الفاتورة المخزنة ويطبق فرق الكميات؛ السعر الحالي في الكتالوج يخص المنتجات المضافة فقط. تغيير المبلغ أو الحساب يعكس Sale الموثق ويعيد ترحيله؛ ثباتهما لا يعيد القيد.
- القيد مدين حساب البيع المختار ودائن Revenue ذي system_slot المعتمد في LedgerService. الفاتورة صفرية بلا قيد صفر. البيع لا ينشئ Payment أو Check أو قبضًا تلقائيًا، ولا توجد علاقة payments.order_id.
- الإلغاء والتحرير والحذف يفحصان تطابق أثر المخزون وقيد Sale، مع قفل الفاتورة وأقفال variants والمعاملة الواحدة. التكلفة غير المعروفة لا تمنع البيع أو المخزون السالب؛ لا توجد تكلفة مفترضة.
- DELETE /orders/:id إلغاء يحفظ المستند ويعكس أثره مرة واحدة. DELETE /orders/:id/permanent يحذف المستند والبنود بعد تسوية أثره، ويحفظ journal/audit/cost/movement history ويفصل inventory_movements وnotifications قبل الحذف.
- audit يحفظ اللقطات التجارية قبل/بعد؛ public checkout يسجل actor_user_id=null. الإشعارات لكل Admin فعال بعد نجاح المعاملة، وفشلها لا يلغي الفاتورة. Idempotency يحمي مساري الإنشاء من تكرار الطلب نفسه.
- SalesReturn مستقل عن Orders: أزيل customer_returns.order_id وعلاقة Prisma ومساراته القديمة في هجرة Returns الجديدة على QA. لا يقيّد المردود كمية الفاتورة أو تعديلها أو حذفها، ولا يغير الفاتورة.
- الهجرة المحلية الجديدة 20261001000000_unified_sales_invoices طبقت على QA المعزولة فقط، ولم تطبق على المصدر alfajrdb أو Production. ترفض Completed دون حساب بدل تخمين حساب. لا تبدأ reset أو migrations أو Manual QA تلقائيًا؛ بيانات المنتجات والصور والمخزون الحالي محفوظة.

## المخزون والتكاليف

- الرصيد الحالي `product_variants.stock_quantity`؛ كل تغيير أعمال جديد يسجل `inventory_movements` في المعاملة نفسها. تعديل المنتج لا يعدل الكمية، وvariant جديد يبدأ بصفر.
- endpoints الحالية Admin: قراءة inventory/movements/cost، وإضافة Opening Stock بكمية موجبة وتكلفة فعلية، وتعديله وإلغاؤه بمعرف الحدث. لا يوجد opening-cost مستقل أو Manual Adjustment.
- Variant جديد بصفر ومتوسط null؛ البيع قبل التكلفة مسموح، ولا تشتق التكلفة من السعر التجاري أو تنشئ صفرًا افتراضيًا. صفر التكلفة المدخل صراحة صالح.
- average_cost متوسط الرصيد الفعلي: stock-in مع رصيد موجب وتكلفة معروفة يوزن بالقيمة الحالية؛ مع رصيد صفر/سالب يصبح المتوسط سعر الإدخال فقط إذا بقي رصيد موجب، وإلا يبقى آخر متوسط معروف. البيع وPurchaseReturn يحافظان على المتوسط؛ SalesReturn الجديد يسجل طبقة بالتكلفة الحالية أو null. عكس/استعادة طبقته يستبعد/يعيد القيمة الأصلية في تسلسلها ويعيد replay، وقد يغير المتوسط بعد مشتريات لاحقة. الأسعار التجارية منفصلة تمامًا.
- Opening Stock قابل للتكرار والتعديل والإلغاء بعد أحداث لاحقة؛ تصحيح Opening/Purchase يستبعد الحدث القديم ويعيد replay حتميًا، ويحفظ الأصل والعكس وaudit. baseline ثابت وlegacy_state يحفظان أثر البيانات القديمة؛ لا تعاد كتابة الكمية الحالية من التاريخ. تناقض التسلسل يرفض بـ INVENTORY_COST_SEQUENCE_INCONSISTENT.
- لا توجد COGS أو تسوية فرق تكلفة في Ledger ضمن هذه الوحدة. الهجرة 20261001010000_carrying_inventory_cost طبقت على QA المعزولة؛ نجحت فحوص PostgreSQL وحفظ الكتالوج وكميات 44 خيارًا بإجمالي 907. لم تطبق على المصدر alfajrdb أو Production.

## المحاسبة والسندات والعملات

- الأرصدة من `accounts` و`journal_entries` و`journal_lines` فقط، وليست من مجموع orders/payments. القيد متوازن وله طرفان على الأقل؛ المبالغ Decimal، قيم القيد بمنزلتين. الرصيد في ledger = المدين ناقص الدائن.
- Party واحد لكل customer عبر `LedgerService.customer`. أنواع الحسابات القابلة للإنشاء General/Party/Bank/Cash؛ الحسابات بلا عملة ثابتة. أكواد الحسابات المعروضة ليست system slots؛ لا تستخدم أسماء الحسابات أو الأكواد العامة لتحديد وظائف النظام.
- السند اليدوي يمنع الحسابات الداخلية؛ Cash وBank ليسا ممنوعين لمجرد is_system. تغيير الاسم لا يغير الهوية/النوع؛ حذف حساب يستخدم فحص جميع مراجعه، والبنك مع حسابات التحصيل التابعة له يعالج في معاملة.
- القبض مدين النقد/حيازة الشيك ودائن الجهة؛ الصرف بالعكس، والشيك الصادر يستعمل البنك المحدد. مسارات سندات الحساب في الواجهة تستخدم ledger للقيود النقدية واليدوية، ومسارات account check للشيكات. لا تفترض أن كل ledger voucher ينشئ صفًا في payments.
- `payments` يحفظ أصول قبض/صرف الزبون أو شيك الحساب؛ الشيك مصدره General/Party غير system. لا تربط تحصيلًا جديدًا بالطلب عبر مسار دفعات محذوف.
- العملات محملة من قاعدة البيانات؛ لا تثبت سعر صرف أو قائمة عملات مفترضة. مبلغ الدفعة وسعر الصرف موجبان، والتحويل `amount * exchange_rate` مقرب لمنزلتين ويجب أن يكون موجبًا. سعر الصرف والمبلغ الأساسي يحفظان على الحركة ولا يعاد حسابهما بتاريخ أسعار جديد.
- تصحيح الحركة المالي إجراء صريح يعكس ويعيد الترحيل؛ إلغاء Payments/returns/purchases/debts/write-offs يحفظ الأثر بالعكس وفق service، وليس محو دفتر اليومية. اقرأ شروط الارتباط قبل التنفيذ.
- تواريخ التقارير والكشوف تتبع `src/common/date-range.ts` ومنطقة الأعمال `Asia/Hebron`؛ يوم from شامل ويوم to شامل عبر حد داخلي لنهاية غير شاملة. لا تستبدلها بتوقيت جهاز Agent.

## الشيكات الواردة والصادرة

- السجل `managed_checks` والحركات `check_events`؛ المبلغ الأصلي والعملة والصرف والمبلغ الأساسي محفوظة. الإجراءات كلها Admin، مع أقفال ومعاملات وتاريخ لا يسبق آخر حركة فعالة.
- الوارد يبدأ TREASURY. الإيداع BANK من TREASURY عند الاستحقاق فقط؛ COLLECTION للتحصيل مسموح قبل الاستحقاق عبر حساب Clearing للبنك. العودة من BANK/COLLECTION إلى TREASURY.
- التجيير من TREASURY إلى General/Party آخر غير المصدر، مع فحص الرصيد الذي يطبقه service؛ رجوع التجيير يعيد TREASURY. العودة للمصدر ثم الاسترجاع، والصرف النقدي من TREASURY إلى Cash محدد مسارات مستقلة.
- `collected` حالة عرض مشتقة: موقع BANK أو COLLECTION وتاريخ الاستحقاق وصل؛ مرور التاريخ لا ينشئ قيدًا.
- الصادر يبدأ ISSUED على بنك مختار؛ clear-outgoing من ISSUED، وreturn-outgoing من ISSUED أو CLEARED يعكس قيد الإصدار ويحدث سجلاته. لا تطبق انتقالات الوارد عليه.
- التراجع عن الحركة وفق آخر حركة فعالة (LIFO) وشروط service. إلغاء أصل Payment يرفض إذا خرج الشيك من الحيازة/الإصدار أو بقيت حركات فعالة؛ تراجع عن الحركات أولًا.
- تعديل تفاصيل/مبلغ/عملة/صرف/مصدر الشيك يمر عبر ChecksService: يعكس ويعيد ترحيل الآثار المالية اللازمة مع حفظ التاريخ وaudit، ويمنع تغيير المصدر لشيك مرتبط بشراء. لا تصحح صف managed_checks وحده.

## المردودات والمشتريات

- SalesReturn → General غير system فقط، بلا Customer/Order/Invoice، ILS فقط. بنود مستقلة بمعرف ثابت، تكرار variant صالح، كمية صحيحة موجبة وسعر يدوي >=0، بلا خصم أو Bonus. الأصناف غير النشطة متاحة وترتيبها الأحدث أولًا. صفر الإجمالي صالح دون قيد صفري، ويظهر مرجع المستند في الكشف.
- /returns يدعم إنشاء Completed، قراءة/بحث/ترشيح/pagination؛ PUT /returns/:id تعديل Completed؛ POST cancel/restore وDELETE permanent متاحة للدورين دون ملكية. Cancelled يحتاج Restore قبل التعديل. رقم RET تلقائي sequence ومحمي من التعديل؛ تاريخ المستند مستقل عن cost chronology.
- الزيادة في التعديل تسجل تكلفة حالية للفرق فقط؛ التخفيض وإزالة السطر تعكسان الطبقات الأصلية LIFO. Cancel يعكس كل طبقات المستند مع حفظها للاستعادة؛ Restore يعيد نفس التكلفة والتسلسل الأصليين عبر CostService/replay. السعر/الحساب/التاريخ/الملاحظات وحدها لا تغير المخزون أو cost events.
- القيد مدين Returns ودائن General؛ تغيير الإجمالي أو الحساب يعكس ويعيد الترحيل ذريًا. الكشف الطبيعي يعرض قيمة المستند الفعالة وتاريخه مرة واحدة؛ تصحيحات القيود محفوظة في التاريخ. لا تنشأ دفعة أو شيك أو سند استرداد تلقائيًا.
- الحذف النهائي يعكس Completed فقط ثم يحذف المستند والبنود والطبقات التابعة؛ يحتفظ بالقيد والحركات والأحداث مع فصل مصدر المستند وتوثيق RET في notes ولقطة Audit. Audit هو History، والطبقات الداخلية لا تعرض في API التجاري. حساب مرتبط بالمستند أو تاريخ SalesReturn محمي من الحذف.
- PurchaseReturn خدمة مستقلة داخل الوحدة ومسارات /purchase-returns، مع الإبقاء على /customer-purchases/:id/returns. تبقى customer_id/customer_purchase_id في الجدول المشترك لهذا المسار فقط؛ General/Party أو زبون/شراء وفق قواعده الحالية. stock-out بالتكلفة الحالية مع unchanged average، وإلغاء يعيد الكمية ويعكس القيد؛ لا تطبق عليه قواعد SalesReturn التجارية الجديدة.
- customer-purchases شراء بضاعة من الزبون/الحساب إلى المخزون، وليس مشتريات الزبون من المتجر. الشراء مدين مقابل المشتريات ودائن Party/الحساب، يزيد المخزون ويحدث متوسط الشراء.
- المسار التقليدي customer_id موجود، والمسار `/customer-purchases/account` يقبل General/Party غير system دون customer_id. دفعات شراء الحساب بسند صرف مستقل؛ endpoint addPayment يرفض شراء account_id.
- إنشاء/تعديل/إلغاء الشراء Admin، القراءة للدورين. تعديل الشراء يعكس أثره السابق ويعيده، ويمنع إجماليًا أقل من الدفعات. إلغاؤه يتطلب إلغاء الدفعات المرتبطة أولًا. تعديل/إلغاء الشراء يرفض مردود شراء فعالًا.

## سلامة العمل وProduction

- تحتاج موافقة صريحة قبل النشر أو تشغيل `deploy-production.sh` أو تغيير Production/قاعدة بياناته/هجراته، reset/drop/truncate/restore/cutover/seed، حذف بيانات حقيقية، أو عمليات QA التي تكتب في قاعدة غير معزولة. لا تعتبر طلب إصلاح كود موافقة على هذه العمليات.
- `deploy-production.sh` يثبت dependencies ويولد Prisma ويطبق migrations ويبني ثم يطلب restart؛ ليس build محليًا فقط. لا تشغله للتحقق.
- لا تضع secrets/passwords/connection strings/tokens في AGENTS أو commits أو مخرجات. استخدم أسماء متغيرات البيئة فقط. لا تعدّل ملفات env أو اتصال Production ضمن مهمة أخرى دون تفويض.
- حافظ على uploads وتخزينها الدائم ونسخها الاحتياطية؛ SPA يحتاج fallback إلى index.html. لا تفترض أن النشر يحفظ ملفات runtime تلقائيًا.
- قبل تعديل الكود افحص Git status في المشروعين واحفظ تغييرات المستخدم، بما فيها الملفات غير المتتبعة. لا تعمل reset/clean أو حذف النسخة الاحتياطية أو commit/push دون طلب.
- لا تغير Business Logic أو التفويض أو العقود أو قواعد المال/المخزون لإسكات اختبار. اربط أي إصلاح بالمهمة، وراجع frontend types/services والـDTO/service معًا.

## Manual QA: الحالة الحالية

- المؤكد بتاريخ 2026-10-02: Products/Inventory DB QA نجحت على alfajr_products_inventory_qa_20261002 المحلية المعزولة فقط: 20 مجموعة PostgreSQL و161 اختبار Backend والفحوص الآلية، مع تطابق الكتالوج والمخزون الأصلي. المصدر alfajrdb بقي read-only. لم يُنفذ Manual UI QA؛ لا تبدأه تلقائيًا. التقرير docs/PRODUCTS_INVENTORY_DB_QA_PASS_2026-10-02.md في Backend يوثق النتائج.
- أحدث تحقق Returns بتاريخ 2026-10-02 على alfajr_returns_qa_20261002 المعزولة المستعادة: 184 اختبارًا و29 مجموعة Returns PostgreSQL و20 مجموعة Products/Inventory و8 مجموعات تكامل تقارير PASS؛ حفظ جميع كميات 44 Variant وإجمالي 907 والمصدر read-only. الحالة READY FOR MANUAL QA، وليست LOCKED. التقرير docs/RETURNS_FINAL_REFACTOR_QA_2026-10-02.md. لم يبدأ Manual UI QA أو نشر أو تطبيق هجرات على المصدر.
- لا يوجد سجل متاح يؤكد أحدث الأجزاء المفحوصة أو آخر جزء متبقٍ في Work؛ نتائج التقارير القديمة أو وجود scripts/logs لا تثبت نجاح النسخة الحالية. اطلب نقطة التوقف من المستخدم قبل وصف جزء بأنه ناجح أو استئناف خطة معتمدة.
- التالي المقترح، وليس نقطة توقف معتمدة: تثبيت بيئة QA محلية معزولة مصرح بها، ثم فحص Admin/Representative والطلب Pending وتأكيده، البيع المباشر/الجملة واختيار General/Party وتغيير الحساب، وفروق المخزون والقيود عند التعديل/الإلغاء/الحذف ورفض العمليات المرتبطة.
- بعد ذلك: opening stock/cost، الشراء للزبون والحساب ودفعاته، المردودات وإلغاؤها، القبض/الصرف والعملات، دورة الشيكات وتعديلها والتراجع LIFO، ثم كشوف الحساب والتقارير والطباعة. افحص رفض الصلاحيات عبر API أيضًا.
- سجل نتيجة كل حالة مع البيئة والمدخلات والمتوقع والفعلي؛ لا تضع بيانات دخول. لا تنفذ هذه القائمة تلقائيًا على بيانات المستخدم أو Production.
