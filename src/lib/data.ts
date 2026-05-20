import { Medicine, Sale, Purchase, DailySales, MonthlySales, AppSettings } from './types';

export const defaultSettings: AppSettings = {
  hospitalName: 'Family Care Hospital',
  tagline: 'Your Health, Our Priority',
  address: 'Main Peshawar Road Opposite Savour Foods, Rawalpindi, Pakistan',
  phone: '+92-333-5151137',
  email: 'pharmacy@familycare.com',
  receiptFooter: 'Thank you for choosing Family Care Hospital. Get well soon!',
  currency: 'PKR',
  currencySymbol: 'Rs',
  taxPercentage: 10,
  lowStockThreshold: 50,
};

// Empty on first launch — add medicines via Inventory screen
export const medicines: Medicine[] = [];

// No sales yet — starting fresh
export const sales: Sale[] = [];

// No purchases yet — starting fresh
export const purchases: Purchase[] = [];

export const dailySalesData: DailySales[] = [
  { date: 'May 14', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'May 15', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'May 16', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'May 17', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'May 18', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'May 19', revenue: 0, cost: 0, profit: 0, orders: 0 },
  { date: 'May 20', revenue: 0, cost: 0, profit: 0, orders: 0 },
];

export const monthlySalesData: MonthlySales[] = [
  { month: 'Jun 25', revenue: 0, cost: 0, profit: 0 },
  { month: 'Jul 25', revenue: 0, cost: 0, profit: 0 },
  { month: 'Aug 25', revenue: 0, cost: 0, profit: 0 },
  { month: 'Sep 25', revenue: 0, cost: 0, profit: 0 },
  { month: 'Oct 25', revenue: 0, cost: 0, profit: 0 },
  { month: 'Nov 25', revenue: 0, cost: 0, profit: 0 },
  { month: 'Dec 25', revenue: 0, cost: 0, profit: 0 },
  { month: 'Jan 26', revenue: 0, cost: 0, profit: 0 },
  { month: 'Feb 26', revenue: 0, cost: 0, profit: 0 },
  { month: 'Mar 26', revenue: 0, cost: 0, profit: 0 },
  { month: 'Apr 26', revenue: 0, cost: 0, profit: 0 },
  { month: 'May 26', revenue: 0, cost: 0, profit: 0 },
];

export const medicineCategories = [
  'All',
  'Analgesics',
  'Antibiotics',
  'Antidiabetics',
  'Antihypertensives',
  'Anti-inflammatory',
  'Antihistamines',
  'Antifungals',
  'Cardiovascular',
  'Gastrointestinal',
  'Respiratory',
  'Vitamins & Supplements',
];
