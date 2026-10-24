import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { Buffer } from "node:buffer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const HOST = "0.0.0.0";
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Konfigurasi Kunci & Kata Laluan
const ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || "JBSWY3DPEHPK3PXP";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// 1. Laluan Web Asas
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "frontpage.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

// 2. Setup 2FA (Google Authenticator)
app.get("/api/auth/setup-2fa", async (req, res) => {
  try {
    const otpauth = authenticator.keyuri(
      "Hakim (Bijak Minds)",
      "KakNadiah_Orbyte",
      ADMIN_TOTP_SECRET,
    );
    const qrImageUrl = await QRCode.toDataURL(otpauth);
    res.json({ success: true, qrImageUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: "Ralat menjana QR 2FA" });
  }
});

// 3. Pengesahan Pentadbir (2FA Verification)
app.post("/api/auth/login-admin", (req, res) => {
  const { password, otpToken } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res
      .status(401)
      .json({ success: false, message: "Kata laluan salah!" });
  }
  const isValidOtp = authenticator.check(otpToken, ADMIN_TOTP_SECRET);
  if (!isValidOtp) {
    return res.status(401).json({
      success: false,
      message: "Kod Google Authenticator salah/luput!",
    });
  }
  return res.json({ success: true, adminToken: "token_" + Date.now() });
});

// 4. Analisis Invois Pembekal & Percanggahan Harga (Gemini 2.5 Flash)
app.post("/api/procure/analyze-invoice", async (req, res) => {
  const { invoiceBase64, mimeType, clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    return res.json({
      success: true,
      data: {
        supplierName: "Pembekal Makanan Segar Sdn Bhd",
        invoiceNumber: "INV-2026-8891",
        invoiceDate: "2026-10-21",
        items: [
          {
            name: "Telur Gred A (Sepapan)",
            qty: 10,
            unitPrice: 16.5,
            agreedPrice: 14.0,
            flag: "HARGA NAIK +RM2.50",
          },
          {
            name: "Minyak Masak 5kg",
            qty: 5,
            unitPrice: 32.0,
            agreedPrice: 32.0,
            flag: "HARGA SEPADAN",
          },
        ],
        totalAmount: 325.0,
        discrepancyFound: true,
        summary:
          "Perhatian Hakim! Ada percanggahan harga bagi Telur Gred A. Harga dituntut RM16.50 sedangkan harga kontrak Orbyte adalah RM14.00.",
      },
    });
  }

  try {
    const prompt = `Anda adalah Kak Nadiah, pembantu operasi pintar SME untuk Orbyte. 
    Analisis invois ini. Kenal pasti nama pembekal, nombor invois, tarikh, senarai item, kuantiti, harga seunit, dan jumlah.
    Bandingkan dengan harga rujukan standard: Telur Gred A (RM14.00), Minyak Masak 5kg (RM32.00), Beras 10kg (RM38.00).
    Jika harga invois melebihi harga rujukan, tandakan sebagai discrepency.
    Keluarkan jawapan dalam format JSON sahaja dengan kunci: supplierName, invoiceNumber, invoiceDate, items (array of {name, qty, unitPrice, agreedPrice, flag}), totalAmount, discrepancyFound (boolean), summary.`;

    const bodyPayload = invoiceBase64
      ? {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: invoiceBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }
      : {
          contents: [
            {
              parts: [
                {
                  text:
                    prompt +
                    " (Sila gunakan data contoh invois barangan dapur restoran)",
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      },
    );

    const result = await response.json();
    const parsedData = JSON.parse(result.candidates[0].content.parts[0].text);
    res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Ralat memproses dengan Gemini AI" });
  }
});

// 5. Enjin Suara Kak Nadiah (ElevenLabs API)
app.post("/api/voice/speak", async (req, res) => {
  const { text, clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.ELEVENLABS_API_KEY || "").trim();

  if (!apiKey) {
    return res
      .status(400)
      .json({ success: false, message: "Kunci ElevenLabs tidak ditemui." });
  }

  const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah (Pre-made default)

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Ralat panggilan ElevenLabs:", response.status, errText);
      return res.status(response.status).send(errText);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Ralat pelayan:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Penjana Surat Rasmi (Gemini 2.5 Flash)
app.post("/api/letter/generate", async (req, res) => {
  const { type, recipient, details, clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || "").trim();

  const prompt = `Tuliskan satu surat rasmi format surat kiriman rasmi Malaysia standard dalam Bahasa Melayu.
  Pengirim: BIJAK MINDS (A & F DREAMS EMPIRE), Cawangan Malaysia.
  Penerima: ${recipient}
  Jenis Surat: ${type} (Contoh: Surat Tuntutan Bayaran Tertunggak / Surat Amaran Tatatertib / Surat Rayuan).
  Fakta Tambahan: ${details}.
  Keluarkan teks surat rasmi yang profesional, tegas tetapi sopan, lengkap dengan tajuk surat berhuruf tebal, dan perenggan tersusun.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const result = await response.json();
    const letterText = result.candidates[0].content.parts[0].text;
    res.json({ success: true, letterText });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menjana surat" });
  }
});

// 7. Endpoint Simulasi Penyelarasan Orbyte (UserId: 416, Bijak Minds)
app.post("/api/orbyte/sync-audit", (req, res) => {
  const { action, details, refId } = req.body;
  const logRecord = {
    organization: "Bijak Minds",
    userId: 416,
    userEmail: "bijakminds@gmail.com",
    action: action || "INVOICE_APPROVAL",
    referenceId: refId || "REF-" + Date.now(),
    details: details,
    timestamp: new Date().toISOString(),
    status: "ORBYTE_SYNC_VERIFIED_200",
  };

  console.log("Audit log direkodkan ke ekosistem Orbyte:", logRecord);
  res.json({ success: true, log: logRecord });
});

// 8. Enjin Suara AI Bebas Kak Nadiah (Versi Eksperimen Asal Pilihan Hakim)
app.post("/api/voice/assistant", async (req, res) => {
  const { userPrompt, clientApiKey, currentDocuments } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      replyText:
        "Hakim, kunci API Gemini belum dimasukkan dalam tetapan atau pelayan.",
    });
  }

  const docsContext =
    currentDocuments && currentDocuments.length > 0
      ? JSON.stringify(currentDocuments)
      : "Tiada rekod tambahan buat masa ini.";

  const systemInstruction = `Nama anda adalah Kak Nadiah. Anda ialah AI Copilot pintar untuk platform Orbyte yang membantu majikan anda, Hakim (SME Bijak Minds).
Karekter & Keupayaan:
1. Anda boleh berbual tentang APA JUA topik yang ditanya oleh Hakim (sama ada urusan bisnes, hal semasa, sains, teknologi, nasihat, atau borak santai harian).
2. Konteks Dokumen Semasa: Berikut ialah data dokumen perniagaan yang ada dalam sistem: ${docsContext}.
3. JIKA Hakim meminta ringkasan/laporan bagi tarikh atau kategori tertentu (contoh: "tolong beri summaries berkaitan laporan operasi dan berniaga pada tarikh..."):
   Berikan respon lisan ringkas untuk dibacakan oleh TTS, DAN pastikan anda menyentuh ringkasan, pandangan (opinion), penyelesaian (solution) dan cadangan (suggestion) yang bernas untuk perniagaan Hakim.
4. Gaya percakapan: Bersahaja, mesra, berwibawa, dan natural dalam Bahasa Melayu harian.
5. Penting untuk Text-to-Speech: Jangan gunakan simbol Markdown seperti asterisks (*), dash (-), atau format kod dalam teks lisan supaya audio dibaca dengan lancar.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemInstruction}\n\nHakim berkata: "${userPrompt}"\n\nBalasan Kak Nadiah:`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Ralat Balasan Google Gemini:", JSON.stringify(result));
      return res.status(response.status).json({
        success: false,
        replyText: `Ralat daripada enjin Gemini: ${result.error?.message || "Gagal berhubung."}`,
      });
    }

    const replyText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    let structuredAnalysis = null;
    if (
      userPrompt.toLowerCase().includes("summar") ||
      userPrompt.toLowerCase().includes("laporan") ||
      userPrompt.toLowerCase().includes("cadangan")
    ) {
      structuredAnalysis = {
        topic: userPrompt,
        summary: replyText,
        opinion:
          "Operasi berjalan pada tahap stabil namun pemantauan aliran tunai dan perbelanjaan pembekal harian perlu dikekalkan.",
        solution:
          "Laksanakan pengesahan e-invois serta-merta bagi mengelakkan pertikaian harga di hujung bulan.",
        suggestion:
          "Automasi peringatan WhatsApp kepada pembekal utama sekiranya berlaku kenaikan harga mendadak.",
      };
    }

    res.json({ success: true, replyText, structuredAnalysis });
  } catch (error) {
    console.error("Ralat Pelayan Gemini:", error);
    res.status(500).json({
      success: false,
      replyText: `Ralat sistem dalaman: ${error.message}`,
    });
  }
});

// 9. Endpoint Hab Dokumen & Pengisihan Pintar AI (PKS Multi-Input)
app.post("/api/documents/classify-and-sort", async (req, res) => {
  const { docName, docHint, fileBase64, mimeType, clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || "").trim();

  // Logik Sandaran jika tiada fail atau tiada kunci API
  if (!apiKey || !fileBase64) {
    let category = "Resit Pembayaran";
    const combinedText = (
      (docName || "") +
      " " +
      (docHint || "")
    ).toLowerCase();

    if (
      combinedText.includes("invois") ||
      combinedText.includes("lhdn") ||
      combinedText.includes("tax")
    ) {
      category = "e-Invois LHDN";
    } else if (
      combinedText.includes("surat") ||
      combinedText.includes("tuntutan") ||
      combinedText.includes("rayuan") ||
      combinedText.includes("notis")
    ) {
      category = "Surat Menyurat";
    } else if (
      combinedText.includes("operasi") ||
      combinedText.includes("stok") ||
      combinedText.includes("dapur") ||
      combinedText.includes("pasar") ||
      combinedText.includes("sisa")
    ) {
      category = "Operasi & Berniaga";
    }

    return res.json({
      success: true,
      data: {
        name: docName || "Dokumen Operasi Baharu",
        category: category,
        date: new Date().toISOString().split("T")[0],
        time: "08:00",
        amount: "RM 240.00",
        summary: `Kak Nadiah menyusun fail ini ke modul ${category} untuk semakan dan kelulusan Hakim.`,
        status: "PENDING",
      },
    });
  }

  // Pemprosesan Sebenar melalui Gemini 2.5 Flash
  try {
    const prompt = `Anda adalah Kak Nadiah, AI Copilot operasi SME untuk platform Orbyte.
Analisis dokumen yang dimuat naik ini.
Nama fail: "${docName}". Cadangan pemilik: "${docHint}".

Kelaskan dokumen ini kepada SALAH SATU kategori berikut sahaja:
1. "Resit Pembayaran"
2. "e-Invois LHDN"
3. "Surat Menyurat"
4. "Operasi & Berniaga"

Keluarkan jawapan dalam format JSON sah SAHAJA dengan kunci:
- "name": nama dokumen yang kemas
- "category": salah satu daripada 4 kategori di atas
- "date": tarikh dokumen (YYYY-MM-DD)
- "time": waktu dokumen jika ada (HH:mm) atau "08:00"
- "amount": jumlah wang jika ada (contoh: "RM 150.00" atau "Tiada")
- "summary": ulasan ringkas 1 ayat tindakan untuk Hakim
- "status": sentiasa "PENDING"`;

    const bodyPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: fileBase64,
              },
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      },
    );

    const result = await response.json();
    const parsedData = JSON.parse(result.candidates[0].content.parts[0].text);
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error("Ralat Gemini:", err);
    return res.status(500).json({
      success: false,
      message: "Ralat memproses dokumen dengan Gemini AI",
    });
  }
}); // Penutup sah bagi endpoint /api/documents/classify-and-sort

// ============================================================================
// ENDPOINT BAHARU (DILETAKKAN DI LUAR SUPAYA BOLEH DIAKSES DENGAN BETUL)
// ============================================================================

const CHAT_HISTORY_FILE = path.join(__dirname, "chat_history.json");

if (!fs.existsSync(CHAT_HISTORY_FILE)) {
  fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([]));
}

// 10. Dapatkan Sejarah Chat Kekal
app.get("/api/chat/history", (req, res) => {
  try {
    const raw = fs.readFileSync(CHAT_HISTORY_FILE, "utf-8");
    res.json({ success: true, history: JSON.parse(raw || "[]") });
  } catch (err) {
    res.json({ success: true, history: [] });
  }
});

// 11. Simpan Mesej Chat
app.post("/api/chat/save-message", (req, res) => {
  try {
    const msg = req.body;
    let list = [];
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      list = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, "utf-8") || "[]");
    }
    list.push(msg);
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(list, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// 12. Ekstraksi Profil Syarikat oleh Gemini AI
app.post("/api/company/auto-extract-profile", async (req, res) => {
  const { contextText, fileBase64, mimeType, clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || "").trim();

  try {
    const prompt = `Anda ialah pembantu AI profil perniagaan PKS. Berdasarkan maklumat teks atau dokumen berikut, ekstrak entiti profil syarikat dalam format JSON:
Kunci JSON yang diperlukan:
{
  "name": "Nama rasmi syarikat",
  "regNo": "Nombor pendaftaran SSM / TIN jika ada",
  "contact": "Emel atau nombor telefon",
  "address": "Alamat lokasi perniagaan",
  "background": "Ringkasan 2-3 ayat tentang industri dan aktiviti utama perniagaan"
}

Konteks Diberikan:
${contextText || ""}`;

    const parts = [{ text: prompt }];
    if (fileBase64 && mimeType) {
      parts.push({ inlineData: { data: fileBase64, mimeType } });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });
    const d = await r.json();
    const parsed = JSON.parse(
      d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}",
    );
    res.json({ success: true, profile: parsed });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gagal mengekstrak profil." });
  }
});

// 13. Penjana Surat Rasmi Dinamik (Disambung ke Profil Syarikat)
app.post("/api/letter/generate-dynamic", async (req, res) => {
  const { purpose, recipient, details, companyData, clientApiKey } = req.body;
  const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || "").trim();

  try {
    const prompt = `Anda ialah enjin penggubal teks surat kiriman rasmi Malaysia.
Tugasan: Tulis HANYA perenggan kandungan badan (body paragraphs) bagi surat rasmi berikut.

Penerima:
${recipient}

Tujuan Surat:
${purpose}

Fakta / Butiran Tambahan:
${details}

Nama Pengirim:
${companyData?.name || "Bijak Minds"}

PERATURAN KETAT:
1. JANGAN letak sebarang ayat pembuka seperti "Tentu, berikut adalah...", "Berikut ialah draf...", atau garisan "---".
2. JANGAN sertakan kepala surat, maklumat syarikat pengirim, tarikh, atau alamat penerima (bahagian ini sudah ada dalam templat).
3. JANGAN sertakan bahagian tandatangan atau nama pengirim di hujung ("Yang benar", "(Tandatangan)...").
4. Mulakan terus dengan perenggan pertama pembuka ("Dengan segala hormatnya, perkara di atas adalah dirujuk.").
5. Sertakan perenggan seterusnya yang dinomborkan (2. ..., 3. ...).
6. Akhiri teks dengan ayat penutup harapan (contoh: "Segala kerjasama dan perhatian pihak tuan amat dihargai dan didahului dengan ucapan ribuan terima kasih.").`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const d = await r.json();
    const letterText =
      d.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal menjana surat.";
    res.json({ success: true, letterText });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Ralat pelayan AI surat." });
  }
});

// 14. Penghantaran Emel Melalui Resend API
app.post("/api/mail/send-resend", async (req, res) => {
  const { to, subject, bodyText } = req.body;
  const resendApiKey = process.env.RESEND_API_KEY || "";

  if (!resendApiKey) {
    return res.status(400).json({
      success: false,
      message:
        "RESEND_API_KEY belum dikonfigurasikan di dalam fail persekitaran (.env) pelayan.",
    });
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Bijak Minds Official <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        text: bodyText,
      }),
    });

    const result = await resp.json();
    if (resp.ok) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || "Ralat Resend API.",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Ralat komunikasi ke pelayan emel." });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Kak Nadiah Orbyte Copilot beroperasi di http://${HOST}:${PORT}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
