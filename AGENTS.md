# ALFAJR — current working reference

## Source of truth and workspace

Latest explicit user decisions take precedence, followed by the actual registered controllers/services/DTOs, Prisma schema and frontend callers. Historical reports, archived scripts and old migrations describe their time; they are not current business contracts. Trace callers before cleanup. Untracked does not mean unused.

- Frontend: `C:/Users/dweer/Desktop/Alfajr-front`, React 18 / TypeScript / Vite 5 / React Router 7 / Tailwind 3 / ESLint 9. `@` maps to `src`.
- Backend: `C:/Users/dweer/Desktop/alfajr-backend/alfajr-backend`, NestJS 12 / TypeScript 6 / Prisma 7 with adapter-pg / PostgreSQL / Vitest 4 / oxlint. The sibling copy is not the active backend.
- Read this reference when working in the backend too. The repositories have independent Git states.
- Routes: frontend `src/App.tsx`; API contracts `src/api`; backend `src/app.module.ts` and feature controllers. Generated Prisma files are not edited by hand.

## Safety and verification

Inspect Git status in both repositories before edits; preserve user work and untracked finalized implementation. No commit/push/reset/clean without authorization.

Do not touch source `alfajrdb`, hosted/Production databases or Production uploads without explicit authorization for that operation. A code request does not authorize database resets, cutover, restore, seed or deployment. Localhost is not proof of an isolated QA target. Read database-writing QA scripts in full and verify their literal target before execution. Preserve database/upload snapshots first. Never expose secrets in output or documentation.

- Frontend: `npm run typecheck`, `npm run build`, `npm run lint`. Build does not include typecheck; no frontend test script exists.
- Backend: `npm run build`, `npm run lint`, `npm test`; optional `npx tsc --noEmit -p tsconfig.json`. No backend typecheck npm script exists.
- Prisma: `npx prisma validate --config prisma7.config.ts`; generate with `npx prisma generate --config prisma7.config.ts`. Deploy writes to the database and needs explicit target authorization. No automatic `db push`, reset or seed.
- Never modify applied migrations. The explicit 2026-10-08 user-approved squash replaced the old 41 migrations and archive with `000000000000_current_baseline`. Existing fully migrated databases must mark this baseline applied with `prisma migrate resolve`; never clear their `_prisma_migrations` or replay baseline SQL on existing tables. Historical QA/cutover scripts referencing removed migrations are retired evidence, not deployment steps.
- `npm run format` and image optimization write files and are not validation commands.
- Database-writing suites run serially: their rollback/concurrency assertions inspect shared state. Independent CPU/build checks may run together.
- Check existing processes/ports before starting or stopping servers. Do not assume an existing process runs the newest build.

Backend requires `DATABASE_URL` and `JWT_SECRET`; `PORT` defaults to 6164. Frontend uses `VITE_API_BASE_URL`, default `http://127.0.0.1:6164`. API routes have no global `/api` prefix. Swagger is `/api` and `/api-json`; images are `/uploads/`. The current CORS reflects origins and Swagger is unconditional: review reverse-proxy restrictions before Production. Password storage/auth architecture is existing behavior; do not redesign it within another task.

## Final direct Account model

There is no active Customer CRUD/model, Customer selector, Party user-facing type, debt/writeoff workflow or hidden Customer creation. User-facing accounts are General/Cash/Bank. Historical physical names (`customer_purchases`, `customer_returns`), source strings (`CustomerPurchase`, `CustomerReturn`) and check identifiers (`SOURCE_PARTY`, `party_account_id`) remain intentional technical identities resolving to General accounts. Do not rename them by appearance.

A shared PostgreSQL sequence gives user-facing accounts immutable ACC numbers; internal/system accounts consume no numbers. Gaps are valid and numbers are never reused. Names are trimmed, case-insensitively unique across all three types without aggressive Arabic normalization. General has optional phone/notes; Cash/Bank optional notes. No account currency, active status, address or Customer dependency. Identity lists/search/options are paginated and have no balances.

Admin creates/edits all user-facing types and can permanently delete only accounts without any financial/history references. Zero balance is insufficient. Representative creates/edits General only, cannot delete and cannot read Cash/Bank financial details. Cash/Bank identity options may be supplied for receipts. Account audit survives deletion.

Ledger is authoritative: balances derive from journal entries/lines, not sums of orders/payments. Internal/system ledger kinds and slots remain; user-facing account numbers are not system slots. Journals are balanced, Decimal values rounded per service. Opening Balance and Account Discount have their own APIs, permissions, lifecycle and audit; prior QA documents were discarded by the approved cutover, architecture retained. Use current account statement/source APIs for effective documents and original/reversal history.

## Permissions

Backend JWT/role guards and service checks are authoritative; UI hiding is not authorization. Admin and Representative are the business roles; public visitors use the retail catalog and online Pending checkout.

Admin manages catalog/inventory/accounts, financial documents, purchases, disbursements, payment correction/cancellation, checks, reports, audit, representatives and settings. Representative creates General accounts, receipts, invoices and Sales Returns; reads permitted General financial information, purchases and Purchase Returns. Purchase Return mutation and managed-check operations remain Admin-only. Invoice/Sales Return access has no ownership restriction where finalized. Read current method-level overrides as well as class guards.

## Orders

One invoice model; Retail/Wholesale are frontend default-price choices only. Completed requires explicit non-system General `sale_account_id`; public `/orders/online` creates account-less Pending. `contact_text` is free text; no Customer identity or automatic receipt/payment/check. Creator comes from JWT (public actor is null).

Totals: `(unit_price - product_discount) * quantity`, then invoice discount. Positive integer quantities, zero regular prices valid, Bonus price/discount zero. One regular and one Bonus line for the same Variant are allowed; duplicate `(variant,is_bonus)` rejected. Zero invoices and Bonus-only invoices are valid without zero-value journals.

Completed deducts all quantities including Bonus; negative stock allowed and unknown cost does not block sale. Pending has no reservation, stock movement or journal. Admin edits/confirms Pending; both roles create/read/edit Completed, cancel and permanently delete under service checks. Cancelled requires its lifecycle rules, cannot be edited. Existing invoice prices stay on edit; current catalog defaults apply only to added products.

Financial amount/account changes reverse/repost documented Sale; unchanged amounts/account do not. Cancel/delete verify inventory and Sale effects, lock invoice/variants and use one transaction. Permanent delete detaches retained movements/notifications and preserves journal/cost/audit evidence. Idempotency protects creation: same key/body returns result, different body rejects. Notifications follow commit; failure does not roll back the invoice. Sales Return is independent of Orders.

## Products, stock and carrying cost

Current balance is `product_variants.stock_quantity`. Every business stock change writes a movement in the same transaction. Product create/update never sets stock; new Variant starts zero with unknown average. Opening Stock is an explicit quantity + actual unit-cost operation, editable/cancellable through CostService replay. No independent opening-cost or manual-adjustment API.

First real purchase initializes cost. Explicit zero cost is valid; no invented zero or price-derived cost. Negative stock is allowed. Positive stock receipts weight current carrying value; receipts covering zero/negative stock use receipt cost only if positive stock remains, otherwise retain last known average. Sales and Purchase Return keep average. Unknown cost remains unknown as implemented.

Corrections exclude original events and replay deterministically without rewriting current stock from legacy history. Fixed baseline represents the clean-cutover stock/cost. Sequence inconsistencies reject, never silently repair. No COGS ledger redesign or negative-stock financial settlement is implemented in this module.

## Returns and purchases

Sales Return: General only, independent of Order/Customer, ILS, positive integer quantities, manual nonnegative financial unit price, no discounts/Bonus, repeated Variant lines valid. Stable item IDs, RET sequence, Completed edit, cancel/restore/permanent delete for both roles without ownership checks. Audit is history; internal cost layers do not appear in commercial API.

Quantity additions value only the increment at current cost; reductions remove internal layers LIFO. Cancel/Restore excludes/restores original valuation in its original chronology and replays; never use quantity-only reversal or current Restore average. Price/account/date/notes changes alone do not affect stock/cost. Financial changes reverse/repost atomically; zero totals have no zero journal. Permanent deletion keeps detached movement/cost/journal/audit history.

Purchases use General as counterparty through `/purchases`, with explicit business date. They add stock and actual purchase cost; money settlement is a separate disbursement. Admin writes, both roles read. Active Purchase Returns block unsafe purchase edit/cancel. Purchase Return is stock-out preserving average; cancellation restores quantity and reverses the appropriate effects. `/purchases/:id/returns` remains an intentional API even if the current UI uses account-based returns.

## Payments, vouchers and checks

Currency/rate/base amount snapshots belong to movements, never to accounts. Active currencies come from the database; do not hardcode exchange rates. Amount/rate positive, conversion rounded to two decimals and must remain positive. Receipts debit Cash/Bank/check holding and credit General; disbursements reverse the direction. Manual Journal is Admin-only and rejects forbidden internal accounts. Correction explicitly reverses/replaces; cancellation preserves history. Not every journal voucher is a payments row.

Managed checks/check events use transactional locks, operation dates, audit and LIFO undo. Incoming starts TREASURY; deposits/collection, bank return, endorsement/return, source return/retrieve and cashing follow current service state rules. Due-date display does not post a journal by passage of time.

FINAL outgoing rule: issuance affects selected Bank immediately. Bank decreases at issuance. CLEARED is a state change only, no second journal and no deferred outgoing-check account. Return/undo reverses/restores issuance correctly without duplication. Payment cancellation must undo active downstream check movements first. Edit through ChecksService, never update managed_check rows alone.

## Reports, dates, runtime data and deployment

Reports/dashboard join direct accounts and authoritative ledger/documents; technical source names are not Customer workflows. Business date ranges use `Asia/Hebron`, inclusive requested days via exclusive next-day boundary. Never substitute the agent device timezone.

Uploads are live data and must persist across deployments. Preserve file hashes and product-image metadata. SPA hosting requires fallback to index.html.

`deploy-production.sh` writes dependencies/migrations/build/restart and must never be run as local validation. Its read-only deployment gate requires the approved direct-account cutover already established; it does not execute clean cutover. Existing installations require staged migration/cutover, not blind migrate-deploy. See the current backend README and final system audit report for rehearsal results and future deployment prerequisites. Exact Production staging rehearsal and separate execution approval are still required.

## QA state

The user confirmed prior final modules: 191 Backend tests, 144 PostgreSQL groups and 17 browser groups passed, original 44 Variants / 907 stock and cost/uploads/accounts preserved. Those are previous results, not proof of the current tree. The final system audit records new results separately in `backend/docs/FINAL_SYSTEM_AUDIT_2026-10-02.md` and `qa-artifacts/system-audit-20261002`.

Final system audit on 2026-10-02: 191 Backend tests, 144 business PostgreSQL groups plus 6 readiness groups, and 24 automated browser groups passed after runtime cleanup. Final preservation confirmed original 44/907, retained 368 Variant carrying/baseline states, 279 Account identities and 43 uploads. A new empty 37-migration chain and saved-source snapshot cutover passed on disposable local databases. Raw fresh/upgraded SQL has documented historical identity/constraint representation differences; current Prisma/API checks pass. This is ready for human Manual QA, not authorization for Production: current staging-copy rehearsal and separate release/security/operational gates remain required.

Approved regression target: isolated `alfajr_accounts_runtime_qa_20261002`. Disposable fresh/upgrade databases have literal `alfajr_system_*_qa_20261002_*` names. Do not reset the approved QA baseline for convenience. Historical evidence/backups remain retained. Automated browser testing is not human Manual QA; do not claim human QA or deployment occurred. Follow the user's next instruction after delivering the final report.
