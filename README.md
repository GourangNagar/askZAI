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

---

## 🚀 How to Use Zai

If Zai is already deployed on the cloud, here is how you use it:

### 1. Create Your Account

1. Open your Zai Live URL in your browser.
2. Click **Create an Account**.
3. Enter your Name, Email, and a secure Password.
4. *Important:* Write down your **12-Word Recovery Phrase**. If you ever forget your password, this is the *only* way to reset it!

### 2. Talk to Zai

Once logged in, you will see a sleek chat interface.

- **Save a Memory:** Just tell Zai a fact! Type *"I bought a coffee for 100 Rupees today"* or *"My friend Sarah is allergic to peanuts"*. Zai's **LLM Router** will instantly detect that this is a fact and save it to your private vault.
- **Ask a Question:** Ask *"How much have I spent on coffee?"* or *"What is Sarah allergic to?"* Zai will scan your private vector database and instantly answer!
- **Do Both at Once:** Type *"I spent 5000 Rupees on groceries, how much money do I have left?"* Zai's router will smartly save your expense *and* answer your question in one go!

### 3. Customize Your Profile

Click the **Profile** tab in the top right. Here you can tell Zai exactly how you want to be treated.

- *Example:* "I am a software engineer. Only give me extremely short, factual answers without any conversational fluff."
- Zai will read these instructions before *every single response*.

---

## 📱 Automating Zai with Apple Shortcuts (iOS)

You can turn Zai into an offline, lightning-fast expense tracker using Apple Shortcuts! This setup allows you to log expenses in 2 seconds, and your phone will secretly batch-sync them to Zai at midnight to save API costs.

### Step 1: Get Your API Token

1. Log into Zai on your phone or computer.
2. Go to the **Profile** tab.
3. Tap the **Copy API Token** button. This massive string of text is your digital passport.

### Step 2: The "Log Expense" Shortcut

This shortcut asks what you bought and saves it silently to your phone.

1. Open the **Shortcuts app** on your iPhone and tap **+** to create a new shortcut. Name it "Log Expense".
2. Add an **Ask for Input** action (Prompt: "What did you buy?", Type: Text).
3. Add another **Ask for Input** action (Prompt: "How much?", Type: Number).
4. Add a **Text** action and type: `I spent [Provided Input (Number)] on [Provided Input (Text)].`
5. Add an **Append to File** action.
   - Set it to Append **Text** to File.
   - Tap "File" and select **iCloud Drive** -> **Shortcuts**.
   - Set File Path to `kai_expenses.txt` and ensure "Make New Line" is checked.
6. Add this shortcut to your home screen! Tap it anytime you buy something.

### Step 3: The "Sync Zai" Shortcut

This shortcut reads your expenses and sends them to your private Zai vault.

1. Create a new shortcut named "Sync Zai".
2. Add the **Get File** action (Turn OFF "Show Document Picker", Path: `kai_expenses.txt`, Turn OFF "Error If Not Found"). *Ensure this is explicitly pulling from the `Shortcuts` folder!*
3. Add an **If** action: If **File** `has any value`.
4. Inside the If block, add a **Text** action: `Here are my expenses for today: [File]`
5. Inside the If block, add a **Get Contents of URL** action:
   - URL: `https://askzai.onrender.com/webhook`
   - Method: **POST**
   - Headers: Key = `Authorization`, Text = `Bearer <PASTE_YOUR_API_TOKEN_HERE>`
   - Request Body: **JSON**
   - Add field: `text` (Text) = `[Text]` (from step 4)
   - Add field: `source` (Text) = `ios_midnight_batch`
6. To avoid iOS privacy popups asking for permission to delete files, we will use an overwrite hack!
7. Still inside the If block, add a blank **Text** action (do not type anything inside it).
8. Add a **Save File** action. Set it to save the blank `[Text]` to `kai_expenses.txt`. Tap the arrow on the block and turn **ON** `Overwrite If File Exists`.

### Step 4: Midnight Automation

1. Go to the **Automation** tab in Shortcuts.
2. Create a new **Time of Day** automation for `11:59 PM` (Daily).
3. Choose **Run Immediately** (do NOT ask before running).
4. Select your **"Sync Zai"** shortcut.

*Done! Your expenses now log instantly and sync seamlessly in your sleep!*

---

## 💻 Tech Setup & Initialization (For Developers)

To host Zai yourself, follow these steps:

### 1. Environment Setup

Clone the repository and set up your `.env` file:

```bash
git clone https://gitlab.com/gourang1/askkai.git
cd askkai
cp .env.example .env
```

Edit your `.env` and configure:

- `OPENAI_API_KEY`: Your OpenAI Key (`sk-proj-...`)
- `JWT_SECRET`: A long, random, secure string used to sign user tokens.
- `DATABASE_URL`: Your Supabase PostgreSQL Connection String.

### 2. Local Initialization

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open **<http://localhost:8000>** in your browser.

### 3. Cloud Deployment

Zai is fully containerized and designed for separated front-end/back-end hosting:

1. **Database:** Create a free [Supabase](https://supabase.com) project and copy your PostgreSQL connection string into `DATABASE_URL`.
2. **Backend (Render):** Connect your GitHub repository to a Render Web Service. Ensure you set the `DATABASE_URL`, `OPENAI_API_KEY`, and `JWT_SECRET` environment variables.
3. **Frontend (Vercel):** Connect your GitHub repository to Vercel. Set the `VITE_API_URL` environment variable to your live Render URL (e.g., `https://askzai.onrender.com`).
