// Add-on for menu items
export interface AddOn {
  id: string;
  label: string;
  price: number;
}

// Menu item definition
export interface MenuItem {
  id: string;
  name: string;
  basePrice: number;
  image?: string; // URL to menu item image
  category: 'main' | 'drinks';
  addOns: AddOn[];
}

// Selected add-on in cart
export interface SelectedAddOn {
  id: string;
  label: string;
  price: number;
}

export type MenuCategory = 'main' | 'drinks';

// Cart item
export interface CartItem {
  id: string; // unique cart item id
  menuId: string;
  name: string;
  image?: string;
  basePrice: number;
  quantity: number;
  addOns: SelectedAddOn[];
  notes: string;
  unitPrice: number; // basePrice + sum of addOns
  subtotal: number; // unitPrice * quantity
}

// Order item as stored in database
export interface OrderItem {
  menu_id: string;
  name: string;
  image?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string;
  add_ons: SelectedAddOn[];
}

// Order status
export type OrderStatus = 'pending' | 'preparing' | 'done' | 'cancelled' | 'rejected';

// Payment method
export type PaymentMethod = 'tunai' | 'qris';

// Order as stored in database
export interface Order {
  id: string;
  order_number: number;
  items: OrderItem[];
  subtotal: number;
  total: number;
  payment_method: PaymentMethod;
  cash_received: number | null;
  change_amount: number | null;
  customer_name: string | null;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Order creation payload
export interface CreateOrderPayload {
  items: OrderItem[];
  subtotal: number;
  total: number;
  payment_method: PaymentMethod;
  cash_received?: number;
  change_amount?: number;
  customer_name?: string;
  notes?: string;
}

export interface CreateOrderInput {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  customerName?: string;
  orderNotes?: string;
}

// Date range filter
export type DateRange = 'today' | '7days' | '30days' | 'custom';

// Order filters
export interface OrderFilters {
  dateRange: DateRange;
  startDate?: Date;
  endDate?: Date;
  status?: OrderStatus | 'all';
  search?: string;
}

// Stats summary
export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingItem: {
    name: string;
    quantity: number;
  } | null;
}

// Menu item sales data
export interface MenuItemSales {
  menuId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface DateWindow {
  start: Date;
  end: Date;
}

export interface RealtimeChangePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  order: Order;
}

export interface RecapSummary {
  stats: OrderStats;
  topItems: MenuItemSales[];
}

// Toast notification
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
