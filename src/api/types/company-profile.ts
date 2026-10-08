import type { IsoDateTimeString } from "./common";

export interface CompanyProfileDataDto {
  company_name: string;
  email: string | null;
  address: string | null;
  city: string | null;
  working_hours: string | null;
  announcement_text: string | null;
  announcement_enabled: boolean;
  home_image_url: string | null;
  about_image_url: string | null;
  contact_image_url: string | null;
  created_at: IsoDateTimeString;
  phones: string[];
}

export interface CompanyProfileResponseDto {
  message: string;
  company: CompanyProfileDataDto;
}

export interface UpdateCompanyProfileDto {
  company_name: string;
  email?: string;
  address?: string;
  city?: string;
  working_hours?: string;
  announcement_text?: string;
  announcement_enabled: boolean;
  phones: string[];
  home_image?: File;
  about_image?: File;
  contact_image?: File;
  remove_home_image?: boolean;
  remove_about_image?: boolean;
  remove_contact_image?: boolean;
}
