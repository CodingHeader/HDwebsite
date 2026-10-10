export interface Setting {
  id: number;
  key: string;
  value: string | null;
}

export interface SiteSettings {
  site_name: string;
  site_description: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  footer_copyright: string;
  footer_icp: string;
  site_logo?: string;
}
