export type Plan = "free" | "pro" | "business";
export type InvoiceStatus = "draft" | "unpaid" | "paid" | "overdue";
export type MemberRole = "owner" | "admin" | "member";
export type SubStatus = "inactive" | "active" | "past_due" | "cancelled";

export interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  logo_url: string | null;
  tax_reg: string | null;
  business_type: string;
  currency: string;
  payment_terms: number;
  default_tax_rate: number;
  next_invoice_number: number;
  invoice_notes: string | null;
  footer_message: string | null;
  reminders_enabled: boolean;
  payment_link: string | null;
  next_quote_number: number;
  plan: Plan;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  tax_id: string | null;
  industry: string | null;
  notes: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  category: string | null;
  created_at: string;
}

export interface InvoiceItem {
  desc: string;
  qty: number;
  rate: number;
  total: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  client_id: string | null;
  number: string;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  description: string | null;
  status: InvoiceStatus;
  tax_rate: number;
  discount: number;
  notes: string | null;
  recurring: string | null;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  currency: string | null;
  fx_rate: number | null;
  public_token: string;
  viewed_at: string | null;
  reminders_sent: number;
  last_reminder_at: string | null;
  amount_paid: number;
  quote_id: string | null;
  recur_next_date: string | null;
  recur_parent_id: string | null;
  recur_auto_send: boolean;
  scheduled_send_date: string | null;
  sent_at: string | null;
  due_soon_sent: boolean;
  disputed_at: string | null;
  dispute_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;
  paid_on: string;
  method: string | null;
  note: string | null;
  home_amount: number | null;
  fee: number;
  home_estimated?: boolean;
  source?: string | null;
  created_at: string;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "converted";

export interface Quote {
  id: string;
  tenant_id: string;
  client_id: string | null;
  number: string;
  issue_date: string | null;
  valid_until: string | null;
  description: string | null;
  status: QuoteStatus;
  tax_rate: number;
  discount: number;
  notes: string | null;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  currency: string | null;
  public_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteFormInput {
  client_id: string | null;
  currency?: string | null;
  number: string;
  issue_date: string | null;
  valid_until: string | null;
  description: string | null;
  tax_rate: number;
  discount: number;
  notes: string | null;
  items: InvoiceItem[];
}

export interface PaymentInput {
  invoice_id: string;
  amount: number;
  paid_on: string;
  method: string | null;
  note: string | null;
  /** What landed in the bank, in the account currency (after fees). */
  home_amount?: number | null;
  /** Fees deducted, in the account currency. */
  fee?: number | null;
}

export interface AiDraft {
  id: string;
  tenant_id: string;
  invoice_id: string;
  tone: string | null;
  subject: string;
  body: string;
  status: "draft" | "sent" | "discarded";
  created_at: string;
  sent_at: string | null;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  paystack_subscription_code: string | null;
  paystack_customer_code: string | null;
  paystack_email_token: string | null;
  plan: Plan;
  status: SubStatus;
  amount: number | null;
  currency: string;
  next_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientInput = Omit<Client, "id" | "tenant_id" | "created_at" | "updated_at">;
export type ProductInput = Omit<Product, "id" | "tenant_id" | "created_at">;

export interface InvoiceFormInput {
  client_id: string | null;
  currency?: string | null;
  number: string;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  description: string | null;
  status: string;
  tax_rate: number;
  discount: number;
  notes: string | null;
  recurring: string | null;
  recur_auto_send?: boolean;
  scheduled_send_date?: string | null;
  items: InvoiceItem[];
}

export interface TenantSettingsInput {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  tax_reg: string | null;
  business_type: string;
  currency: string;
  payment_terms: number;
  default_tax_rate: number;
  next_invoice_number: number;
  invoice_notes: string | null;
  footer_message: string | null;
  payment_link?: string | null;
}
