(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/chatbot/LLM-Chatbot-Platform/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f40$ai$2d$sdk$2f$react$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/chatbot/LLM-Chatbot-Platform/node_modules/@ai-sdk/react/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/chatbot/LLM-Chatbot-Platform/node_modules/ai/dist/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/chatbot/LLM-Chatbot-Platform/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function mapApiMessagesToUIMessages(apiMessages) {
    return apiMessages.map((m)=>({
            id: String(m.messageId),
            role: m.role,
            parts: [
                {
                    type: "text",
                    text: m.message
                }
            ]
        }));
}
async function getChatMessages(id) {
    const res = await fetch(`/api/chat/${id}/messages`, {
        method: "GET"
    });
    if (!res.ok) throw new Error("Failed to load messages");
    return res.json();
}
async function fetchAllChats() {
    const res = await fetch("/api/chat");
    if (!res.ok) throw new Error("Failed to load chats");
    return res.json();
}
function toolActivityLabel(part) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isToolOrDynamicToolUIPart"])(part)) return null;
    const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getToolOrDynamicToolName"])(part);
    switch(name){
        case "lookup_course_materials":
            if (part.state === "output-available") return "Read course materials";
            if (part.state === "output-error") return "Course materials lookup failed";
            return "Looking up course materials…";
        case "search_web":
            if (part.state === "output-available") return "Searched the web";
            if (part.state === "output-error") return "Web search failed";
            return "Searching the web…";
        default:
            if (part.state === "output-available") return `Finished: ${name}`;
            if (part.state === "output-error") return `Failed: ${name}`;
            return `Running ${name}…`;
    }
}
function hasInFlightToolOrReasoning(msg) {
    for (const p of msg.parts){
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isToolOrDynamicToolUIPart"])(p)) {
            if (p.state === "input-streaming" || p.state === "input-available") {
                return true;
            }
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isReasoningUIPart"])(p) && p.state === "streaming") return true;
    }
    return false;
}
function CollapsibleReasoningBlock({ text, state }) {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const streaming = state === "streaming";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "reasoning-block",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                className: "reasoning-trigger",
                onClick: ()=>setOpen((v)=>!v),
                "aria-expanded": open,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "reasoning-chevron",
                        "aria-hidden": true,
                        children: open ? "▼" : "▶"
                    }, void 0, false, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 96,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "reasoning-label",
                        children: "Thinking"
                    }, void 0, false, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 99,
                        columnNumber: 9
                    }, this),
                    streaming && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "reasoning-streaming-dot",
                        children: "…"
                    }, void 0, false, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 100,
                        columnNumber: 23
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                lineNumber: 90,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "reasoning-text-wrap",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "reasoning-text",
                    children: text || (streaming ? "…" : "")
                }, void 0, false, {
                    fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                    lineNumber: 104,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                lineNumber: 103,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
        lineNumber: 89,
        columnNumber: 5
    }, this);
}
_s(CollapsibleReasoningBlock, "xG1TONbKtDWtdOTrXaTAsNhPg/Q=");
_c = CollapsibleReasoningBlock;
function streamingStatusHint(last) {
    if (!last || last.role !== "assistant") return "Thinking…";
    if (last.parts.length === 0) return "Thinking…";
    for(let i = last.parts.length - 1; i >= 0; i--){
        const p = last.parts[i];
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isToolOrDynamicToolUIPart"])(p)) {
            if (p.state === "input-streaming" || p.state === "input-available") {
                return toolActivityLabel(p) ?? "Thinking…";
            }
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isReasoningUIPart"])(p) && p.state === "streaming") return "Thinking…";
    }
    return "Writing…";
}
function Page() {
    _s1();
    const [activeChatId, setActiveChatId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [allChats, setAllChats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const chatRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [isAtBottom, setIsAtBottom] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const hadNoActiveChatRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const { messages, sendMessage, status, setMessages } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f40$ai$2d$sdk$2f$react$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChat"])({
        transport: new __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["DefaultChatTransport"]({
            api: "/api/chat"
        }),
        messages: []
    });
    // Load chat list on mount and when coming back from a new chat
    const loadChats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Page.useCallback[loadChats]": async ()=>{
            try {
                const chats = await fetchAllChats();
                setAllChats(chats);
            } catch (e) {
                console.error("Failed to fetch chats", e);
            }
        }
    }["Page.useCallback[loadChats]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            loadChats();
        }
    }["Page.useEffect"], [
        loadChats
    ]);
    // When switching to a chat, load its messages; when no chat, clear messages
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            if (!activeChatId) {
                setMessages([]);
                return;
            }
            setMessages([]);
            getChatMessages(activeChatId).then({
                "Page.useEffect": (data)=>setMessages(mapApiMessagesToUIMessages(data))
            }["Page.useEffect"]).catch({
                "Page.useEffect": (e)=>console.error("Failed to load messages", e)
            }["Page.useEffect"]);
        }
    }["Page.useEffect"], [
        activeChatId,
        setMessages
    ]);
    // After sending first message in "new chat", refetch list and select newest
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            if (!hadNoActiveChatRef.current || status !== "ready" && status !== "streaming") return;
            hadNoActiveChatRef.current = false;
            fetchAllChats().then({
                "Page.useEffect": (chats)=>{
                    setAllChats(chats);
                    if (chats.length > 0) setActiveChatId(String(chats[0].chatId));
                }
            }["Page.useEffect"]);
        }
    }["Page.useEffect"], [
        status
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            const el = chatRef.current;
            if (!el) return;
            const onScroll = {
                "Page.useEffect.onScroll": ()=>{
                    const threshold = 50;
                    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
                }
            }["Page.useEffect.onScroll"];
            el.addEventListener("scroll", onScroll);
            return ({
                "Page.useEffect": ()=>el.removeEventListener("scroll", onScroll)
            })["Page.useEffect"];
        }
    }["Page.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            if (isAtBottom) {
                chatRef.current?.scrollTo({
                    top: chatRef.current.scrollHeight,
                    behavior: "smooth"
                });
            }
        }
    }["Page.useEffect"], [
        messages,
        status,
        isAtBottom
    ]);
    const { thinkingRowVisible, thinkingRowLabel } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Page.useMemo": ()=>{
            if (status !== "streaming" && status !== "submitted") {
                return {
                    thinkingRowVisible: false,
                    thinkingRowLabel: ""
                };
            }
            const last = messages[messages.length - 1];
            if (status === "submitted") {
                return {
                    thinkingRowVisible: true,
                    thinkingRowLabel: streamingStatusHint(last?.role === "assistant" ? last : undefined)
                };
            }
            if (status === "streaming") {
                if (!last || last.role === "user") {
                    return {
                        thinkingRowVisible: true,
                        thinkingRowLabel: "Thinking…"
                    };
                }
                if (last.role === "assistant" && hasInFlightToolOrReasoning(last)) {
                    return {
                        thinkingRowVisible: true,
                        thinkingRowLabel: streamingStatusHint(last)
                    };
                }
            }
            return {
                thinkingRowVisible: false,
                thinkingRowLabel: ""
            };
        }
    }["Page.useMemo"], [
        messages,
        status
    ]);
    const handleSubmit = (e)=>{
        e.preventDefault();
        const text = input.trim();
        if (!text || status !== "ready") return;
        if (!activeChatId) hadNoActiveChatRef.current = true;
        sendMessage({
            text
        }, {
            body: {
                chatId: activeChatId ? Number(activeChatId) : null
            }
        });
        setInput("");
    };
    const handleKeyDown = (e)=>{
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const text = input.trim();
            if (!text || status !== "ready") return;
            if (!activeChatId) hadNoActiveChatRef.current = true;
            sendMessage({
                text
            }, {
                body: {
                    chatId: activeChatId ? Number(activeChatId) : null
                }
            });
            setInput("");
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "parent-container",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "history",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "history-header",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                children: "Chats"
                            }, void 0, false, {
                                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                lineNumber: 258,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "new-chat-btn",
                                onClick: ()=>setActiveChatId(undefined),
                                title: "New chat",
                                children: "+ New"
                            }, void 0, false, {
                                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                lineNumber: 259,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 257,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "chat-list",
                        children: allChats.map((chat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: activeChatId === String(chat.chatId) ? "active" : "",
                                    onClick: ()=>setActiveChatId(String(chat.chatId)),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "chat-title",
                                        children: chat.title || "New Chat"
                                    }, void 0, false, {
                                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                        lineNumber: 276,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                    lineNumber: 271,
                                    columnNumber: 15
                                }, this)
                            }, chat.chatId, false, {
                                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                lineNumber: 270,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 268,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                lineNumber: 256,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "rest",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat",
                        ref: chatRef,
                        children: [
                            messages.length === 0 && status === "ready" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "empty-state",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "Start a new chat or pick one from the sidebar."
                                }, void 0, false, {
                                    fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                    lineNumber: 287,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                lineNumber: 286,
                                columnNumber: 13
                            }, this),
                            messages.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: message.role === "user" ? "chatUser" : "chatAI",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "message-role",
                                            children: [
                                                message.role === "user" ? "You" : "AI",
                                                ":"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                            lineNumber: 297,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "message-content",
                                            children: message.parts.map((part, index)=>{
                                                if (part.type === "text") {
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: part.text
                                                    }, index, false, {
                                                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                                        lineNumber: 303,
                                                        columnNumber: 28
                                                    }, this);
                                                }
                                                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isReasoningUIPart"])(part)) {
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CollapsibleReasoningBlock, {
                                                        text: part.text,
                                                        state: part.state
                                                    }, index, false, {
                                                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                                        lineNumber: 307,
                                                        columnNumber: 23
                                                    }, this);
                                                }
                                                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isToolOrDynamicToolUIPart"])(part)) {
                                                    const line = toolActivityLabel(part);
                                                    if (!line) return null;
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `tool-activity tool-state-${part.state}`,
                                                        children: line
                                                    }, index, false, {
                                                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                                        lineNumber: 318,
                                                        columnNumber: 23
                                                    }, this);
                                                }
                                                return null;
                                            })
                                        }, void 0, false, {
                                            fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                            lineNumber: 300,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, message.id, true, {
                                    fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                    lineNumber: 291,
                                    columnNumber: 13
                                }, this)),
                            thinkingRowVisible && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "chatAI thinking",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "message-role",
                                        children: "AI:"
                                    }, void 0, false, {
                                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                        lineNumber: 333,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "spinner"
                                    }, void 0, false, {
                                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                        lineNumber: 334,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "thinking-text",
                                        children: thinkingRowLabel
                                    }, void 0, false, {
                                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                        lineNumber: 335,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                lineNumber: 332,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 284,
                        columnNumber: 9
                    }, this),
                    !isAtBottom && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "jump-to-bottom",
                        onClick: ()=>chatRef.current?.scrollTo({
                                top: chatRef.current.scrollHeight,
                                behavior: "smooth"
                            }),
                        children: "Jump to latest ↓"
                    }, void 0, false, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 341,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        onSubmit: handleSubmit,
                        className: "input-form",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                className: "input",
                                value: input,
                                rows: 1,
                                onChange: (e)=>{
                                    setInput(e.target.value);
                                    const t = e.target;
                                    t.style.height = "auto";
                                    t.style.height = t.scrollHeight + "px";
                                },
                                onKeyDown: handleKeyDown,
                                disabled: status !== "ready",
                                placeholder: "Message ahmadGPT…"
                            }, void 0, false, {
                                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                lineNumber: 356,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "submit",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    disabled: status !== "ready",
                                    children: [
                                        status === "submitted" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "submit-spinner"
                                        }, void 0, false, {
                                            fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                            lineNumber: 372,
                                            columnNumber: 42
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "submit-label",
                                            children: "Send"
                                        }, void 0, false, {
                                            fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                            lineNumber: 373,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                    lineNumber: 371,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                                lineNumber: 370,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                        lineNumber: 355,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
                lineNumber: 283,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/chatbot/LLM-Chatbot-Platform/app/page.tsx",
        lineNumber: 255,
        columnNumber: 5
    }, this);
}
_s1(Page, "zy4FTY89Dj4Flmzfua/rsqbNuKs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$chatbot$2f$LLM$2d$Chatbot$2d$Platform$2f$node_modules$2f40$ai$2d$sdk$2f$react$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChat"]
    ];
});
_c1 = Page;
var _c, _c1;
__turbopack_context__.k.register(_c, "CollapsibleReasoningBlock");
__turbopack_context__.k.register(_c1, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=chatbot_LLM-Chatbot-Platform_app_page_tsx_3cdb1d2b._.js.map