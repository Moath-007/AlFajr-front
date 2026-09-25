import type { CompanyProfileDataDto } from "@/api";
import { formatOrderDateTime } from "@/components/rep/repOrderUtils";

export interface PrintFilter {
  label: string;
  value: string;
}

export default function PrintHeader({
  company,
  title,
  subtitle,
  filters = [],
}: {
  company: CompanyProfileDataDto | null;
  title: string;
  subtitle?: string;
  filters?: PrintFilter[];
}) {
  return (
    <>
      <header className="print-header print-only">
        <div>
          <div className="print-header-company">
            <img
              src="/assets/al-fajr-logo.webp"
              alt=""
              className="print-header-logo"
            />
            <div>
              <h1>{company?.company_name || "شركة الفجر للصناعة والتجارة"}</h1>
              {company?.phones.length ? <p>{company.phones.join(" · ")}</p> : null}
              <p>
                {[company?.address, company?.city, company?.email]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </div>
        <div className="print-meta">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
          <p>تاريخ الإنشاء: {formatOrderDateTime(new Date())}</p>
        </div>
      </header>
      {filters.length ? (
        <div className="print-filter-list print-only">
          {filters.map((filter) => (
            <span key={filter.label}>
              <b>{filter.label}:</b> {filter.value}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
