import type { CompanyProfileDataDto } from '@/api';

export interface PublicCompanyDetails {
  companyName: string | null;
  phones: string[];
  email: string | null;
  location: string | null;
  workingHours: string | null;
}

export function getPublicCompanyDetails(company: CompanyProfileDataDto | null): PublicCompanyDetails {
  const phones = Array.from(new Set((company?.phones ?? []).map(cleanText).filter(isText)));
  const address = cleanText(company?.address);
  const city = cleanText(company?.city);

  return {
    companyName: cleanText(company?.company_name),
    phones,
    email: cleanText(company?.email),
    location: [address, city].filter(isText).join('، ') || null,
    workingHours: cleanText(company?.working_hours),
  };
}

function cleanText(value?: string | null): string | null {
  const cleaned = value?.trim();
  return cleaned || null;
}

function isText(value: string | null): value is string {
  return value !== null;
}
