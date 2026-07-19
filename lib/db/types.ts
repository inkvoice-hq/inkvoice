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
  tax_reg: string | null;
  business_type: string;
  currency: string;
  payment_terms: number;
  default_tax_rate: number;
  next_invoice_number: number;
  invoice_notes: string | null;
  footer_message: string | null;
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
  created_at: string;
  updated_at: string;
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
export type InvoiceInput = Omit<Invoice, "id" | "tenant_id" | "created_at" | "updated_at">;
