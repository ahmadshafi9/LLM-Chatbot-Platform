"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("./lib/db");
db_1.db.exec("\n  CREATE TABLE IF NOT EXISTS chats (\n    chatId INTEGER PRIMARY KEY AUTOINCREMENT,\n    title TEXT NOT NULL\n  );\n\n  CREATE TABLE IF NOT EXISTS chatMessages (\n    messageId INTEGER PRIMARY KEY AUTOINCREMENT,\n    chatId INTEGER NOT NULL,\n    message TEXT NOT NULL,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (chatId) REFERENCES chats(chatId) ON DELETE CASCADE\n  );\n");
