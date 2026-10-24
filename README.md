# Kak Nadiah – Orbyte Smart SME Copilot 🚀
*SDC Hackathon 2026 Submission (Domain 2)*

> **Team:** Bijak Minds  
> **Team Leader:** Ammar Hakim Bin Dzulhaidi  
> **Ecosystem Target:** Orbyte Cloud (Workspace ID: 416)

---

## 📺 Project Demo Video
[![Kak Nadiah Demo Video](https://img.shields.io/badge/YouTube-Watch%20Demo%20Video-red?style=for-the-badge&logo=youtube)](https://youtu.be/ifgGhA9cloo)

> 💡 **Nota Penting Penilaian / Note for Evaluators:**  
> Pautan demo rasmi boleh ditonton secara terus melalui: **[Tonton Video Demo YouTube (Team Bijak Minds)](https://youtu.be/ifgGhA9cloo)**.  
> Disebabkan kuota token kredit percuma ElevenLabs telah habis semasa sesi ujian akhir dan rakaman, sistem telah mengaktifkan ciri keselamatan **Dynamic Browser Speech Fallback**. Kak Nadiah tetap berfungsi sepenuhnya membacakan teks balasan secara langsung menggunakan enjin suara bawaan pelayar web (*browser-native Web Speech Synthesis*) tanpa sebarang gangguan operasi.

---

## ☁️ Deployment & Replit Environment Verification
The prototype is fully configured, built, and executed on Replit containerized cloud runner.

![Replit Environment Verification](./replit-proof.png)

- 🌐 **Live Deployed Prototype (Replit):** https://590b068c-dd0e-4e78-9e04-78baeb87c670-00-3ttbi7c4xh6it.sisko.replit.dev/

---

## 📌 Project Overview
**Kak Nadiah** is an AI-powered smart copilot tailored specifically for Micro and Small-and-Medium Enterprises (MSMEs). It integrates advanced multimodal reasoning, automated document processing, local language accessibility, and strict governance to streamline daily SME operations, financial auditing, and LHDN e-invoicing compliance.

---

## 🛠️ Tech Stack & Architecture
- **Frontend:** HTML5, Tailwind CSS (Neo-Brutalism Design System), Vanilla JavaScript, Chart.js (Real-time analytics), and browser-native translation compatibility (249+ languages).
- **Backend:** Node.js & Express.js REST API server.
- **Security & Governance:** OTPLib (RFC 6238 TOTP Google Authenticator 2FA) and cryptographic audit logs synced to Orbyte Cloud.
- **AI Models & Third-Party APIs:**
  * **Google Gemini 2.5 Flash API:** Multimodal receipt/invoice vision parsing, discrepancy detection, and dynamic official letter drafting.
  * **ElevenLabs Multilingual v2 API (with Auto-Fallback):** Neural Text-to-Speech (TTS) for natural voice interactions. *(Sistem dilengkapi sandaran automatik ke Web Speech Synthesis sekiranya kuota ElevenLabs mencapai had maksimum).*
  * **Resend API:** Transactional email cloud service for instant dispatch of official business documents.

---

## 📁 Repository Structure
- `server.js` - Core Express.js backend server and API routing endpoints.
- `public/` - Frontend dashboard interfaces (`frontpage.html`, `admin-dashboard.html`, `history.html`).
- `chat_history.json` - Local audit log and session persistence storage.

---

## 🔒 Security & Compliance
All sensitive financial data processing is handled ephemerally via secure HTTPS transmissions. Privileged actions and operational ledgers require mandatory Google Authenticator 2FA verification to enforce strict Human-in-the-Loop governance.
