# 🥗 Sui-Nutrition AI

**Decentralized Health Intelligence powered by Sui Network & Google Gemini AI.**

> 🏆 **Hackathon Submission Project**

## 📖 Introduction

**Sui-Nutrition AI** is a specialized dApp that combines the transparency of Blockchain with the intelligence of Generative AI. We help users manage their nutrition by analyzing food images and generating personalized diet plans, payable seamlessly via SUI tokens.

Unlike traditional health apps, Sui-Nutrition AI ensures that every service request is transparently recorded on-chain, paving the way for a future **"Health-to-Earn"** ecosystem where users own their health data as NFTs.

## ✨ Key Features

### 1. 📸 AI Food Scanner
* **Input:** Users upload a photo of their meal.
* **Process:** The system validates the payment (0.01 SUI) on the Sui Testnet.
* **Output:** AI analyzes the image to estimate Calories, Macros (Protein, Fat, Carbs), and provides a nutritional assessment.

### 2. 📅 Personalized Diet Plan
* **Input:** User provides Body Metrics (Height, Weight) and Goal (Weight Loss, Muscle Gain, etc.).
* **Process:** AI acts as a professional Personal Trainer (PT) to calculate BMI and design a tailored 7-day Eat Clean menu.
* **Output:** A detailed, day-by-day meal plan formatted beautifully in Markdown.

## 🛠️ Tech Stack

* **Blockchain:** Sui Network (Move Smart Contract).
* **Frontend:** Next.js 14, TypeScript, Tailwind CSS (Glassmorphism UI), `@mysten/dapp-kit`.
* **Backend:** Python, Google Gemini 1.5 Flash API (via `google.generativeai`).
* **Integration:** On-chain Event Listener (`PaymentReceived`).

## 🏗️ Architecture

The system operates on a **Hybrid Web3 Architecture**:

1.  **User Action:** User interacts with the Next.js Frontend and signs a transaction via Sui Wallet.
2.  **On-Chain:** The Move Contract verifies the payment and emits a `PaymentReceived` event.
3.  **Event Listener:** The Python Backend (running locally) listens for this specific event on the Sui Testnet.
4.  **AI Processing:**
    * If Type = 1: Backend sends the uploaded image to **Gemini Vision**.
    * If Type = 2: Backend sends user stats to **Gemini Text**.
5.  **Result Display:** The Backend processes the AI response and pushes it back to the Frontend in real-time.

## 🚀 Getting Started

Follow these steps to run the project locally.

## ✨ Key Features
1.  **📸 AI Food Scanner**: Upload a photo -> Pay 0.01 SUI -> Get Macros & Calories info.
2.  **📅 Personalized Diet Plan**: Enter stats -> Pay 0.01 SUI -> Get a 7-day custom menu.

## 🛠️ Tech Stack
* **Blockchain**: Sui Move Smart Contract (Testnet).
* **Frontend**: Next.js 14, Tailwind CSS (Cyberpunk UI).
* **Backend**: Python, Google Gemini Flash API.
* **Integration**: On-chain Event Listener.

## 🚀 Quick Start
1.  **Backend**:
    ```bash
    cd backend
    pip install requests google-generativeai
    python main.py
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install react-markdown remark-gfm
    npm run dev
    ```
3.  **Enjoy**: Open `http://localhost:3000`