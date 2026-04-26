import { getServiceSupabase } from "./server";

export interface Chat {
  chatId: number;
  title: string;
  group_name?: string;
}

export interface ChatMessage {
  messageId: number;
  chatId: number;
  message: string;
  role: string;
  created_at: string;
}

function truncateTitle(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

export async function getAllChats(ownerId: string): Promise<Chat[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("chats")
    .select("chat_id, title, group_name")
    .eq("owner_id", ownerId)
    .order("chat_id", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    chatId: Number(row.chat_id),
    title: row.title,
    group_name: row.group_name ?? undefined,
  }));
}

export async function insertChat(
  title: string,
  groupName: string | null,
  ownerId: string
): Promise<number> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("chats")
    .insert({ title: truncateTitle(title), group_name: groupName, owner_id: ownerId })
    .select("chat_id")
    .single();
  if (error) throw error;
  return Number(data.chat_id);
}

export async function insertChatMessage(
  chatId: number,
  message: string,
  role: string
): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("chat_messages")
    .insert({ chat_id: chatId, message, role });
  if (error) throw error;
}

export async function getChatMessages(chatId: number): Promise<ChatMessage[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("message_id, chat_id, message, role, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    messageId: Number(row.message_id),
    chatId: Number(row.chat_id),
    message: row.message,
    role: row.role,
    created_at: row.created_at,
  }));
}

export async function deleteChat(chatId: number, ownerId: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("chat_id", chatId)
    .eq("owner_id", ownerId);
  if (error) throw error;
}

export async function migrateChatOwner(from: string, to: string): Promise<number> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("chats")
    .update({ owner_id: to })
    .eq("owner_id", from)
    .select("chat_id");
  if (error) throw error;
  return data?.length ?? 0;
}
