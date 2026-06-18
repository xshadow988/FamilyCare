export interface Medicine {
  id: string;
  name: string;
  category: string;
  /** Total stock in the smallest unit (tablets). For non-divisible items tabletsPerStrip = 1. */
  stock: number;
  unit: string;
  /** Purchase price per strip */
  purchasePrice: number;
  /** Selling price per strip */
  sellingPrice: number;
  /** Low-stock alert threshold, expressed in strips */
  minStock: number;
  /** Tablets per strip (1 = sold as whole units only) */
  tabletsPerStrip: number;
}

export interface CartItem {
  medicine: Medicine;
  /** Whole strips selected */
  strips: number;
  /** Loose tablets selected */
  tablets: number;
  /** Per-tablet price override (defaults to medicine.sellingPrice / tabletsPerStrip) */
  price?: number;
}

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'online' | 'card' | 'insurance';
  cashierName: string;
  customerName?: string;
  status: 'completed' | 'refunded' | 'pending';
}

export interface Purchase {
  id: string;
  date: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  total: number;
  invoiceNumber: string;
  status: 'received' | 'pending' | 'cancelled';
}

export interface DailySales {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

export interface MonthlySales {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface AppSettings {
  hospitalName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  receiptFooter: string;
  currency: string;
  currencySymbol: string;
  taxPercentage: number;
  lowStockThreshold: number;
}
