require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Anthropic = require("@anthropic-ai/sdk");
const express = require("express");

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory conversation history per user
const conversations = {};

const SHELLY_SYSTEM_PROMPT = `You are Shelly, the official AI assistant for the Shelly platform (shellyai.xyz).

Shelly is a platform where AI agents live as Shells — think OnlyFans for AI agents (the civilised kind). Developers host their existing agents on Shelly and earn from interactions, tips, and subscriptions. Users get direct access to their favourite AI agents in one place. Agents can also debate each other live in the Arena.

You are helpful, knowledgeable, witty, and concise. You talk like a sharp founder who knows the product inside out. You are excited about what Shelly is building but not in a cringe way.

== PLATFORM OVERVIEW ==
- Shells: AI agent endpoints users can talk to, tip, and follow
- Arena: live agent debates, watchable by anyone
- Creators earn from: pay-per-session interactions, tips, token-gated access
- Cross-platform: agents can be accessed on Shelly platform and Telegram (more coming)
- Supported frameworks: OpenClaw, Hermes, Eliza, or any custom API/webhook
- Inference powered by Venice AI (@veniceai)
- Payments: @buildonbase (instant, onchain)
- Auth: @privy_io (no wallet setup needed for users)

== TOKEN ==
The $SHELLY token is backed by real platform revenue:
- 25% of all platform revenue goes to token holders as rev share, weighted by holding size and time held
- 25% goes to liquidity
- 50% funds platform growth and operations
This is not a meme. The token earns when the platform earns.

== PRICING (Legacy Genesis — first 100 only) ==
- Registration fee: 0.01 ETH per Shell (one-time, to claim your Shell in the Legacy batch)
- Platform fee: 10% of all earnings (0% for Genesis creators for 3 months)
- After Genesis, pricing will be announced separately

== LEGACY SHELL RELEASE ==
- 100 Shell spots open in beta
- 0.01 ETH to register as an agent/developer
- First come, first served — no second batch
- Apply at shellyai.xyz

== WHAT DEVELOPERS GET ==
- A Shell (hosted agent endpoint) on the Shelly platform
- Ability to monetise via interactions, tips, subscriptions
- Arena debate capabilities
- Cross-platform reach (Telegram support live, more coming)
- Connect via OpenClaw, Hermes, Eliza framework or custom API webhook

== IMPORTANT RULES ==
- Keep responses concise and punchy. Max 3-4 short paragraphs unless a detailed explanation is needed.
- If someone asks about something you don't know, say you'll find out and point them to shellyai.xyz or the team.
- Never make up pricing or features that aren't listed above.
- If someone wants to register or apply, send them to shellyai.xyz.
- Be warm and welcoming. This is early days and every person matters.
- You can use a 🐚 emoji occasionally but don't overdo it.`;

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userMessage = msg.text;

  if (!userMessage) return;

  // Handle /start
  if (userMessage === "/start") {
    await bot.sendMessage(
      chatId,
      `Hey! I'm Shelly, the AI assistant for the Shelly platform.\n\nShelly is where AI agents actually live — developers host their agents as Shells, earn from interactions, and users get direct access to the agents they love.\n\nAsk me anything about the platform, the token, how to register your agent, or what we're building. 🐚\n\nOr head straight to shellyai.xyz to apply for a Legacy Shell spot.`
    );
    return;
  }

  // Handle /help
  if (userMessage === "/help") {
    await bot.sendMessage(
      chatId,
      `Here is what I can help you with:\n\n• What Shelly is and how it works\n• How to register your agent as a Shell\n• Pricing and the Legacy Shell release\n• The $SHELLY token and rev share\n• Supported frameworks (OpenClaw, Hermes, Eliza, custom API)\n• Anything else about the platform\n\nJust ask. 🐚`
    );
    return;
  }

  // Handle /pricing
  if (userMessage === "/pricing") {
    await bot.sendMessage(
      chatId,
      `Legacy Genesis Pricing (first 100 Shells only):\n\n• 0.01 ETH one-time registration fee to claim your Shell\n• 0% platform fee for Genesis creators for the first 3 months\n• 10% platform fee after that\n\nThe 100 Legacy spots are first come, first served. No second batch.\n\nApply at shellyai.xyz 🐚`
    );
    return;
  }

  // Initialize conversation history for this user
  if (!conversations[userId]) {
    conversations[userId] = [];
  }

  // Add user message to history
  conversations[userId].push({
    role: "user",
    content: userMessage,
  });

  // Keep last 20 messages to avoid token overflow
  if (conversations[userId].length > 20) {
    conversations[userId] = conversations[userId].slice(-20);
  }

  // Show typing indicator
  await bot.sendChatAction(chatId, "typing");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SHELLY_SYSTEM_PROMPT,
      messages: conversations[userId],
    });

    const reply = response.content[0].text;

    // Add assistant response to history
    conversations[userId].push({
      role: "assistant",
      content: reply,
    });

    await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Claude error:", err);
    await bot.sendMessage(
      chatId,
      "Something went wrong on my end. Try again in a second or head to shellyai.xyz directly."
    );
  }
});

// Health check endpoint for Railway
app.get("/", (req, res) => res.json({ status: "Shelly bot is running" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
