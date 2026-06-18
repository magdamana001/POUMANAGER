/** Proveedor del bar. */
export interface Supplier {
  id: string;
  name: string;
  phone: string;
  /** Email de contacto (opcional). */
  email?: string;
  /** Días de la semana que vienen a tomar pedido (0=Lun … 6=Dom). */
  visitDays: number[];
  /** Días hasta la entrega tras enviar el pedido (para la alerta). */
  leadDays: number;
  /** Notas internas del proveedor. */
  notes?: string;
  /** Logo del proveedor: emoji o data URL de imagen (opcional). */
  logo?: string;
  color: string;
}

/** Producto del catálogo, asignado a un proveedor. */
export interface Product {
  id: string;
  supplierId: string;
  name: string;
  /** Unidad de pedido: ud, caja, kg, botella… */
  unit: string;
  /** Categoría para agrupar (bebidas, limpieza…). */
  category?: string;
  /** Coste por unidad. */
  price?: number;
  /** Stock actual. */
  stock?: number;
  /** Punto de pedido: si el stock baja de aquí, se sugiere pedir. */
  minStock?: number;
  /** Icono del catálogo: emoji o data URL de imagen (opcional). */
  icon?: string;
}

export type OrderStatus = "borrador" | "enviado" | "recibido";

export interface OrderLine {
  productId: string;
  qty: number;
  /** Marcado al verificar la recepción. */
  received?: boolean;
  /** Cantidad realmente recibida (si difiere de la pedida). */
  receivedQty?: number;
}

/** Pedido a un proveedor. */
export interface Order {
  id: string;
  /** Número de pedido correlativo. */
  reference?: number;
  supplierId: string;
  /** Fecha de creación (YYYY-MM-DD). */
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  /** Fecha de envío del pedido. */
  sentAt?: string;
  /** Fecha prevista de recepción (genera la alerta). */
  expectedDate?: string;
  /** Fecha real de recepción. */
  receivedAt?: string;
  note?: string;
}

export interface OrdersData {
  suppliers: Supplier[];
  products: Product[];
  orders: Order[];
}
