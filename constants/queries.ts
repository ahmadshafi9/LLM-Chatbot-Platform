
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
    SELECT * FROM chats
`;

export const INSERT_CHAT = `
  INSERT INTO chats (title)
  VALUES (?);
`;

export const INSERT_CHAT_MESSAGE = `
  INSERT INTO chatMessages (chatId, message, role)
  VALUES (?, ?, ?);
`;


/*
create table chat with chatid and chat summary made by ai using the first message
insert into chat summary as title
insert into chatMessages all the messages
*/
// constants/queries.ts