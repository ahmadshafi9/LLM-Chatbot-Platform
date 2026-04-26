export const GET_CHAT = `
  SELECT chatId, title
  FROM chats
  WHERE chatId = ?;
`;

export const GET_CHAT_MESSAGES = `
  SELECT messageId, chatId, message, role, created_at
  FROM chatMessages
  WHERE chatId = ?
  ORDER BY created_at ASC;
`;

export const GET_ALL_CHATS = `
  SELECT chatId, title, group_name
  FROM chats
  WHERE owner_id = ?
  ORDER BY chatId DESC;
`;

export const INSERT_CHAT = `
  INSERT INTO chats (title, group_name, owner_id)
  VALUES (?, ?, ?);
`;

export const MIGRATE_CHATS_OWNER = `
  UPDATE chats SET owner_id = ? WHERE owner_id = ?;
`;

export const INSERT_CHAT_MESSAGE = `
  INSERT INTO chatMessages (chatId, message, role)
  VALUES (?, ?, ?);
`;