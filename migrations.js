"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("./lib/db");
db_1.db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    chatId INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chatMessages (
    messageId INTEGER PRIMARY KEY AUTOINCREMENT,
    chatId INTEGER NOT NULL,
    message TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES chats(chatId) ON DELETE CASCADE
  );
`);
console.log("Migrations ran successfully ✅");
