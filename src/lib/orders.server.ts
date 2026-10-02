/**
 * Pedidos do checkout próprio (somente servidor). A tabela `orders` é criada por
 * supabase/orders.sql; enquanto ela não existir, as gravações falham sem travar o pagamento.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type OrderRow = {
  transaction_id: string;
  status: string;
  amount: number;
  shipping_id: string;
  shipping_price: number;
  items: { id: string; name: string; quantity: number; unit_price: number }[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string;
  address: Record<string, string | undefined>;
};

type Result = PromiseLike<{ error: { message: string } | null }>;
type OrdersTable = {
  insert(row: OrderRow): Result;
  update(patch: { status: string; paid_at?: string }): {
    eq(column: "transaction_id", value: string): { neq(column: "status", value: string): Result };
  };
};

// `orders` ainda não está nos tipos gerados do Supabase.
function orders() {
  return (supabaseAdmin as unknown as { from(table: "orders"): OrdersTable }).from("orders");
}

export async function saveOrder(row: OrderRow) {
  try {
    const { error } = await orders().insert(row);
    if (error) console.error("[orders] erro ao salvar pedido", row.transaction_id, error.message);
  } catch (err) {
    console.error("[orders] erro ao salvar pedido", row.transaction_id, err);
  }
}

export async function updateOrderStatus(transactionId: string, status: string) {
  try {
    const patch = status === "PAID" ? { status, paid_at: new Date().toISOString() } : { status };
    // Não sobrescreve um pedido que já está no mesmo status (evita mexer no paid_at).
    const { error } = await orders()
      .update(patch)
      .eq("transaction_id", transactionId)
      .neq("status", status);
    if (error) console.error("[orders] erro ao atualizar pedido", transactionId, error.message);
  } catch (err) {
    console.error("[orders] erro ao atualizar pedido", transactionId, err);
  }
}
