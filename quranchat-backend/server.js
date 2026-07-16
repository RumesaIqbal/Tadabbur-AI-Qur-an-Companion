import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import os from 'os';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

dotenv.config({ path: './.env' });

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// ---------- Supabase Client ----------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("URL:", process.env.SUPABASE_URL);
console.log(
  "KEY PREFIX:",
  process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30)
);
const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- Auth Middleware ----------
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Authorization header missing",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error(error);

      return res.status(401).json({
        error: "Invalid token",
      });
    }

    req.userId = user.id;

    next();
  } catch (err) {
    console.error(err);

    return res.status(401).json({
      error: "Authentication failed",
    });
  }
};

// ---------- Groq Setup ----------
console.log('🔑 API Key loaded:', process.env.GROQ_API_KEY ? '✅ Present' : '❌ Missing');

if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is missing in .env');
  process.exit(1);
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ---------- Health Check ----------
app.get('/api/health', (req, res) => {
   console.log('🔍 health check:', req.userId);
  res.json({ status: 'ok', message: 'Qur’an Chat API (Groq) is running' });
});

// ---------- Verse Details Endpoint ----------
app.post('/api/verse', async (req, res) => {
  try {
    const { surah_number, verse_number } = req.body;

    // Validate inputs
    if (surah_number == null || verse_number == null) {
      return res.status(400).json({
        error: 'Missing required fields: surah_number and verse_number',
      });
    }

    if (!Number.isInteger(surah_number) || !Number.isInteger(verse_number) ||
        surah_number < 1 || surah_number > 114 || verse_number < 1) {
      return res.status(400).json({
        error: 'Invalid surah or verse number',
      });
    }

    const prompt = `
You are a Qur’anic scholar. For the given surah number ${surah_number} and verse number ${verse_number}, provide:

1. **English translation** (Sahih International or a similar reliable translation) of that verse.
2. **Short context/reason of revelation** (Asbab al-Nuzul) – brief, 2-3 sentences only.

Format your response as exactly:

Translation: [the translation]
Context: [the short context]

If the verse does not have a known reason of revelation, state "No specific reason of revelation recorded."

Do not add any other text. Keep it concise.
    `.trim();

    console.log(`📤 Fetching details for Surah ${surah_number}, Verse ${verse_number}`);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
    });

    const rawReply = completion.choices[0]?.message?.content || '';
    console.log('📥 Raw verse response:', rawReply);

    // Parse the response to extract translation and context
    let translation = '';
    let context = '';

    const lines = rawReply.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (const line of lines) {
      if (line.toLowerCase().startsWith('translation:')) {
        translation = line.replace(/^translation:\s*/i, '').trim();
      } else if (line.toLowerCase().startsWith('context:')) {
        context = line.replace(/^context:\s*/i, '').trim();
      }
    }

    // If parsing failed, fallback to raw reply
    if (!translation && !context) {
      // Try to split by "Context:" if the model didn't follow exactly
      const parts = rawReply.split(/Context:/i);
      if (parts.length >= 2) {
        translation = parts[0].replace(/Translation:/i, '').trim();
        context = parts[1].trim();
      } else {
        // Fallback: use entire reply as translation
        translation = rawReply;
        context = 'Context not available.';
      }
    }

    res.json({
      surah_number,
      verse_number,
      translation: translation || 'Translation not available.',
      context: context || 'No context available.',
    });
  } catch (error) {
    console.error('❌ Verse API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// ---------- Chat Endpoint (unchanged) ----------
app.post('/api/chat', authenticateUser, async (req, res) => {
  const { message, conversation_id } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid message' });
  }

  try {
    let convId = conversation_id;

    // If no conversation, create one with default title
    if (!convId) {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          user_id: req.userId,
          title: 'New Chat',
        })
        .select()
        .single();
      if (convErr) throw convErr;
      convId = newConv.id;
    } else {
      // Verify ownership
      const { data: check, error: checkErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', convId)
        .eq('user_id', req.userId)
        .single();
      if (checkErr || !check) {
        return res.status(403).json({ error: 'Not authorized to write to this conversation' });
      }
    }

    // Save user message
    const { error: userMsgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: message,
      });
    if (userMsgErr) throw userMsgErr;

    // ---- AI call ----
    const fullPrompt = `
You are a Qur’an expert. Answer the user's question using only Qur’anic verses.

If the question is about the Qur’an or Islam, respond with:
- Arabic verse(s): [write the verse in Arabic script with reference in starting parentheses i.e surah no:verse number strictly mentioned]
- English translation: [give the translation]
- Explanation: [explain the verse(s) in the context of the question in a short 2-3 sentence paragraph]
- Give each verse as 1. Arabic verse , English Translation then 2. Arabic verse , English Translation and so on. and combined explanation at the end.
If the question is not about the Qur’an or Islam or any general guidance that can be answered in light of quran only then  reply: "I am a Qur’an‑focused assistant. Please ask about the Qur’an or Islamic guidance."

User question: ${message.trim()}
    `.trim();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const rawReply = completion.choices[0]?.message?.content || 'No response from AI.';

    // Save assistant reply
    const { error: assistantMsgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: rawReply,
      });
    if (assistantMsgErr) throw assistantMsgErr;

    // ---- Update conversation title if still default ----
    const { data: convCheck } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', convId)
      .single();

    if (convCheck && (convCheck.title === 'New Chat' || convCheck.title === null || convCheck.title === '')) {
      // Fetch the first user message of this conversation
      const { data: firstMsg } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', convId)
        .eq('role', 'user')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstMsg) {
        const newTitle = firstMsg.content.slice(0, 50);
        await supabase
          .from('conversations')
          .update({ title: newTitle })
          .eq('id', convId);
      }
    }

    // Update updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);

    res.json({ reply: rawReply, conversation_id: convId });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Delete a conversation (and its messages) ----------
app.delete('/api/conversations/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  try {
    // Verify ownership
    const { data: conv, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (findError || !conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete messages first (cascade delete if foreign key constraint is set to CASCADE)
    // If you have ON DELETE CASCADE on messages.conversation_id, you can skip this step.
    // But to be safe, we delete explicitly.
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id);

    if (msgError) throw msgError;

    // Delete conversation
    const { error: delError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (delError) throw delError;

    res.json({ success: true });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== SAVED VERSES ENDPOINTS ==========
// ---------- Daily Verse with Tafsir ----------
app.get('/api/daily-verse', authenticateUser, async (req, res) => {
  try {
    // Get today's date as a seed
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if we already have a daily verse for today in a "daily_verse" table
    // If not, generate one and store it.
    // For simplicity, we'll generate on the fly and not store.
    // But to avoid regenerating multiple times, we can cache in-memory for the day.

    // Use a deterministic pseudo-random based on date to pick a verse
    // We'll pick a random surah and verse from a list of well-known verses or a wide range.
    // For simplicity, we'll use a fixed list of popular verses (you can expand).
    const popularVerses = [
      { surah: 1, verse: 1 },   // Al-Fatihah
      { surah: 2, verse: 255 }, // Ayat al-Kursi
      { surah: 2, verse: 286 },
      { surah: 3, verse: 185 },
      { surah: 4, verse: 135 },
      { surah: 5, verse: 8 },
      { surah: 6, verse: 162 },
      { surah: 7, verse: 128 },
      { surah: 8, verse: 46 },
      { surah: 9, verse: 119 },
      { surah: 10, verse: 57 },
      { surah: 11, verse: 6 },
      { surah: 12, verse: 87 },
      { surah: 13, verse: 28 },
      { surah: 14, verse: 7 },
      { surah: 15, verse: 9 },
      { surah: 16, verse: 97 },
      { surah: 17, verse: 81 },
      { surah: 18, verse: 46 },
      { surah: 19, verse: 96 },
      { surah: 20, verse: 14 },
      { surah: 21, verse: 35 },
      { surah: 22, verse: 78 },
      { surah: 23, verse: 115 },
      { surah: 24, verse: 35 },
      { surah: 25, verse: 74 },
      { surah: 26, verse: 227 },
      { surah: 27, verse: 65 },
      { surah: 28, verse: 88 },
      { surah: 29, verse: 57 },
      { surah: 30, verse: 30 },
      { surah: 31, verse: 18 },
      { surah: 32, verse: 5 },
      { surah: 33, verse: 70 },
      { surah: 34, verse: 10 },
      { surah: 35, verse: 15 },
      { surah: 36, verse: 82 },
      { surah: 37, verse: 180 },
      { surah: 38, verse: 71 },
      { surah: 39, verse: 53 },
      { surah: 40, verse: 60 },
      { surah: 41, verse: 30 },
      { surah: 42, verse: 5 },
      { surah: 43, verse: 84 },
      { surah: 44, verse: 6 },
      { surah: 45, verse: 22 },
      { surah: 46, verse: 15 },
      { surah: 47, verse: 7 },
      { surah: 48, verse: 29 },
      { surah: 49, verse: 13 },
      { surah: 50, verse: 16 },
      { surah: 51, verse: 56 },
      { surah: 52, verse: 49 },
      { surah: 53, verse: 39 },
      { surah: 54, verse: 49 },
      { surah: 55, verse: 13 },
      { surah: 56, verse: 77 },
      { surah: 57, verse: 27 },
      { surah: 58, verse: 11 },
      { surah: 59, verse: 18 },
      { surah: 60, verse: 8 },
      { surah: 61, verse: 14 },
      { surah: 62, verse: 2 },
      { surah: 63, verse: 9 },
      { surah: 64, verse: 16 },
      { surah: 65, verse: 2 },
      { surah: 66, verse: 8 },
      { surah: 67, verse: 15 },
      { surah: 68, verse: 4 },
      { surah: 69, verse: 52 },
      { surah: 70, verse: 24 },
      { surah: 71, verse: 10 },
      { surah: 72, verse: 20 },
      { surah: 73, verse: 20 },
      { surah: 74, verse: 56 },
      { surah: 75, verse: 40 },
      { surah: 76, verse: 3 },
      { surah: 77, verse: 50 },
      { surah: 78, verse: 31 },
      { surah: 79, verse: 40 },
      { surah: 80, verse: 11 },
      { surah: 81, verse: 27 },
      { surah: 82, verse: 19 },
      { surah: 83, verse: 14 },
      { surah: 84, verse: 22 },
      { surah: 85, verse: 20 },
      { surah: 86, verse: 4 },
      { surah: 87, verse: 17 },
      { surah: 88, verse: 21 },
      { surah: 89, verse: 27 },
      { surah: 90, verse: 15 },
      { surah: 91, verse: 9 },
      { surah: 92, verse: 18 },
      { surah: 93, verse: 5 },
      { surah: 94, verse: 6 },
      { surah: 95, verse: 8 },
      { surah: 96, verse: 1 },
      { surah: 97, verse: 1 },
      { surah: 98, verse: 5 },
      { surah: 99, verse: 7 },
      { surah: 100, verse: 9 },
      { surah: 101, verse: 10 },
      { surah: 102, verse: 8 },
      { surah: 103, verse: 1 },
      { surah: 104, verse: 9 },
      { surah: 105, verse: 5 },
      { surah: 106, verse: 4 },
      { surah: 107, verse: 7 },
      { surah: 108, verse: 3 },
      { surah: 109, verse: 6 },
      { surah: 110, verse: 3 },
      { surah: 111, verse: 5 },
      { surah: 112, verse: 1 },
      { surah: 113, verse: 5 },
      { surah: 114, verse: 6 },
    ];

    // Use date as seed
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % popularVerses.length;
    const { surah, verse } = popularVerses[index];

    // Now fetch details using Groq (or use your /api/verse logic)
    const prompt = `
You are a Qur’anic scholar. For Surah ${surah}, Verse ${verse}, provide:

1. **Arabic text** of the verse (with diacritics).
2. **English translation** (Sahih International or similar).
3. **Tafsir/explanation** (2-3 sentences, clear and concise).

Format your response exactly as:

Arabic: [Arabic text]
Translation: [English translation]
Tafsir: [Explanation]

Do not add any other text. Keep it concise.
    `.trim();

    console.log(`📤 Generating daily verse for Surah ${surah}, Verse ${verse}`);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const rawReply = completion.choices[0]?.message?.content || '';
    console.log('📥 Raw daily verse response:', rawReply);

    // Parse response
    let arabic = '';
    let translation = '';
    let tafsir = '';

    const lines = rawReply.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (const line of lines) {
      if (line.toLowerCase().startsWith('arabic:')) {
        arabic = line.replace(/^arabic:\s*/i, '').trim();
      } else if (line.toLowerCase().startsWith('translation:')) {
        translation = line.replace(/^translation:\s*/i, '').trim();
      } else if (line.toLowerCase().startsWith('tafsir:')) {
        tafsir = line.replace(/^tafsir:\s*/i, '').trim();
      }
    }

    // Fallback if parsing fails
    if (!arabic && !translation && !tafsir) {
      // Try to split by "Translation:" etc.
      const parts = rawReply.split(/Translation:/i);
      if (parts.length >= 2) {
        const arabicPart = parts[0].replace(/Arabic:/i, '').trim();
        const rest = parts[1].split(/Tafsir:/i);
        translation = rest[0].trim();
        tafsir = rest[1] ? rest[1].trim() : 'Tafsir not available.';
        arabic = arabicPart;
      } else {
        arabic = rawReply;
        translation = 'Translation not available.';
        tafsir = 'Tafsir not available.';
      }
    }

    res.json({
      surah,
      verse,
      arabic: arabic || 'Arabic text not available.',
      translation: translation || 'Translation not available.',
      tafsir: tafsir || 'Tafsir not available.',
      reference: `${surah}:${verse}`,
    });
  } catch (err) {
    console.error('❌ Daily verse error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message,
    });
  }
});
app.get('/api/prayer-timings', authenticateUser, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    let lat = parseFloat(latitude) || 24.8607; // default Karachi
    let lng = parseFloat(longitude) || 67.0011;
    // For Pakistan, method=1 (Karachi)
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch prayer times');
    const data = await response.json();
    const timings = data.data.timings;
    // Also get date
    const date = data.data.date.readable;
    // Determine next prayer
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
    const prayerTimes = {};
    const prayerNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Sunset', 'Maghrib', 'Isha'];
    let nextPrayer = null;
    let nextTime = null;
    for (const name of prayerNames) {
      if (timings[name]) {
        const [hours, minutes] = timings[name].split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        prayerTimes[name] = { time: timings[name], minutes: totalMinutes };
        if (totalMinutes > currentTime) {
          if (!nextPrayer || totalMinutes < nextTime) {
            nextPrayer = name;
            nextTime = totalMinutes;
          }
        }
      }
    }
    // If no next prayer today, it's the first prayer tomorrow (Fajr)
    if (!nextPrayer) {
      nextPrayer = 'Fajr';
      // For tomorrow, we could compute but we'll just set it as next
    }
    res.json({
      timings,
      date,
      nextPrayer,
      nextTime: nextPrayer ? timings[nextPrayer] : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// ---------- GET /api/saved/recent ----------
// Returns up to 3 most recently saved verses for the authenticated user
app.get('/api/saved/recent', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_verses')
      .select(`
        id,
        surah_number,
        verse_number,
        verse_text,
        created_at
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// ---------- GET /api/saved ----------
// Paginated list of all saved verses for the authenticated user
// Query: ?limit=20&offset=0
app.get('/api/saved', authenticateUser, async (req, res) => {
  console.log('🔍 Fetching saved verses for user:', req.userId);
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const { data, error } = await supabase
      .from('saved_verses')
      .select(`
        id,
        surah_number,
        verse_number,
        verse_text,
        created_at
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { count, error: countError } = await supabase
      .from('saved_verses')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', req.userId);

    if (countError) throw countError;

    res.json({
      data,
      total: count,
      limit,
      offset,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// ---------- POST /api/saved ----------
// Save a new verse (checks for duplicate)
app.post('/api/saved', authenticateUser, async (req, res) => {
  try {
    const {
      surah_number,
      verse_number,
      verse_text,
    } = req.body;

    // Validate
    if (
      surah_number == null ||
      verse_number == null ||
      !verse_text
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Check duplicate
    const { data: existing, error: checkError } = await supabase
      .from("saved_verses")
      .select("id")
      .eq("user_id", req.userId)
      .eq("surah_number", surah_number)
      .eq("verse_number", verse_number)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return res.status(409).json({
        error: "Verse already saved",
      });
    }

    // Insert
    const { data, error } = await supabase
      .from("saved_verses")
      .insert({
        user_id: req.userId,
        surah_number,
        verse_number,
        verse_text,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// ---------- DELETE /api/saved/:id ----------
// Delete a saved verse (only if it belongs to the user)
app.delete('/api/saved/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: verse, error } = await supabase
      .from('saved_verses')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;

    if (!verse) {
      return res.status(404).json({
        error: "Verse not found",
      });
    }

    const { error: deleteError } = await supabase
      .from('saved_verses')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});
//-------------API's for Chat history------------------------
app.get('/api/conversations', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversations/:id/messages', authenticateUser, async (req, res) => {
  const { id } = req.params;
  try {
    // Ensure the conversation belongs to the user
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();
    if (convErr || !conv) return res.status(404).json({ error: 'Conversation not found' });

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations', authenticateUser, async (req, res) => {
  const { title } = req.body;
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: req.userId, title: title || 'New Chat' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ---------- Helper: Get local IP ----------
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ---------- Start Server ----------

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`🚀 Server running on ${port}`);
  });
}

export default app;