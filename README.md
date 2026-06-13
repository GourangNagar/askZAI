# Zai — Personal AI Assistant 🧠

> **Secure FastAPI Server · Multi-Tenant Agentic RAG · iOS Shortcuts Integration**

Zai is a highly optimized, fully private personal AI assistant designed to act as your "second brain". It effortlessly tracks expenses, remembers random facts, and answers complex questions using an advanced **Agentic Retrieval-Augmented Generation (RAG)** architecture.

With its latest update, **Zai supports multiple concurrent users!** Each user signs up with their email, gets their own cryptographically secure "vault" of memories, and can silently sync data offline from their iPhone.

---

## 🛠️ System Architecture

Zai is engineered for scale, privacy, and low-latency responses, leveraging a modern AI tech stack:

- **Agentic LLM Intent Router:** Replaced brittle heuristic/math-based routing with a dynamic LLM intent classifier (`gpt-4o-mini`). Zai intelligently understands the semantic difference between *"I make 100k"* (SAVE) and *"How much do I make?"* (QUERY), automatically executing the correct downstream pipeline.
- **Persistent RAG Pipeline:** Integrates **ChromaDB** for highly accurate semantic vector search, allowing Zai to retrieve the exact memories needed to answer questions in milliseconds.
- **Relational Graph Engine:** Built a custom graph extraction engine that dynamically parses unstructured text into `(Entity-Relation-Entity)` tuples, allowing Zai to query 1-hop subgraphs to understand complex relational contexts.
- **Multi-Tenant FastAPI Backend:** A highly concurrent **FastAPI** server using secure **JWT-based authentication** and **Bcrypt** hashing.
- **Serverless Cloud Deployment:** The React frontend is deployed globally via **Vercel**, the FastAPI backend is hosted on **Render**, and all persistent data is securely stored in a scalable **Supabase PostgreSQL** database.

### ⚡ UX & Performance Engineering (The Struggle for "0ms")

Building a web app was easy; making it feel indistinguishable from a native iOS app was the real challenge.

- **Zero-Unmount Tab Switching:** Standard React Router destroyed components on tab switch, wiping chat history and causing painful database re-fetches. Zai mounts all tabs concurrently and uses CSS visibility to instantly slide them in and out, achieving true `0ms` latency tab switching.
- **Optimistic UI:** To combat network latency, all edits and deletions instantly update the UI locally before the server responds, resulting in a buttery-smooth, frictionless experience.
- **Persistent Local Caching:** Chat history is stored in the browser's `localStorage`, ensuring that even if the app is force-quit, the conversation memory survives.
- **Silent Background Sync:** When returning from an iOS shortcut, the app detects the visibility change and silently fetches new data in the background without intrusive loading spinners.
- **Bulletproof Backend Sanitization:** Attempting to handle "Income vs Expense" through negative math hacks on the frontend corrupted charts and broke UX. The Python backend now mathematically sanitizes all inputs and uses semantic keyword scanning (e.g., `Salary`, `Dividend`) to forcefully and invisibly categorize incomes correctly.

---

## 🚀 How to Use Zai

Zai is already deployed on the cloud, here is how you use it:

**[Visit Zai Here](https://ask-zai.vercel.app)**

### 1. Create Your Account

1. Open your Zai Live URL in your browser, add the shortcut to your home screen for quick access.
2. Click **Create an Account**.
3. Enter your Name, Email, and a secure Password.
4. *Important:* Write down your **12-Word Recovery Phrase**. If you ever forget your password, this is the *only* way to reset it!

### 2. Talk to Zai

Once logged in, you will see a sleek chat interface.

- **Save a Memory:** Just tell Zai a fact! Type *"I bought a coffee for 100 Rupees today"* or *"My friend Sarah is allergic to peanuts"*. Zai's **LLM Router** will instantly detect that this is a fact and save it to your private vault.
- **Ask a Question:** Ask *"How much have I spent on coffee?"* or *"What is Sarah allergic to?"* Zai will scan your private vector database and instantly answer!
- **Do Both at Once:** Type *"I spent 5000 Rupees on groceries, how much money do I have left?"* Zai's router will smartly save your expense *and* answer your question in one go!

### 3. Customize Your Profile

Click the **Profile** tab in the top right. This is the "Brain Control Center" for Zai, where you define its boundaries and its persona:

- **Custom Categories (The Boundaries):** If we let the AI freely name categories, your dashboard pie chart would become a fragmented mess of 100 different slices (e.g., classifying a burger as "Fast Food" on Monday and "Junk Food" on Tuesday). By defining strict custom categories here, we force the AI to map all your unstructured text (like "I bought a burger") strictly into one of your approved buckets.
- **Profession (The Persona):** Your profession heavily dictates the financial advice Zai gives you in the AI Insights Report. If you tell Zai you are a "Medical Student", it will generate sympathetic advice about managing loans on a tight budget. If you are an "Investment Banker", it will give you aggressive wealth-building strategies.
- **AI Instructions:** Set global rules like "Only give me extremely short, factual answers without conversational fluff," and Zai will obey them before every single response.

---

## 📱 Automating Zai with Apple Shortcuts (iOS)

You can turn Zai into a lightning-fast expense tracker that works from anywhere on your iPhone in less than 2 seconds.

**[Download the 1-Click Zai iOS Shortcut Here](https://www.icloud.com/shortcuts/96379ec0caf6473fa363c90ce961eecc)**

### How to set it up

1. Tap the link above on your iPhone to download the **Zai** shortcut.
2. Open the shortcut settings.
3. Replace the placeholder `email` and `password` variables with the exact credentials you used to sign up for your Zai account.
4. Add the shortcut to your home screen!

Now, whenever you buy something, just tap Zai on your home screen, type the amount and category, and it will instantly sync to your live database.
