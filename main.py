"""
Zai — Personal AI Assistant
FastAPI webhook server with LangChain Agentic RAG, OpenAI, and Google OAuth Multi-Tenancy.
"""

import os
import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import secrets

import jwt
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import bcrypt
from sqlalchemy.orm import Session

from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

from database import SessionLocal, User, Profile, Transaction

# Load the secrets FIRST
load_dotenv()

IST = timezone(timedelta(hours=5, minutes=30))

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("kai")

# ── Config ────────────────────────────────────────────────────────────────────
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL     = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
JWT_SECRET       = os.getenv("JWT_SECRET", "super-secret-default-key-change-me")

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Zai — Personal AI Banker",
    description="Secure webhook with Multi-Tenant Agentic RAG and Web UI",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Security & Auth ───────────────────────────────────────────────────────────
WORDLIST = ["apple", "ocean", "zebra", "moon", "star", "river", "mountain", "cloud", "sun", "tree", "bird", "fish", "bear", "wolf", "fox", "lion", "tiger", "hawk", "eagle", "snake", "lizard", "frog", "toad", "whale", "shark", "dolphin", "turtle", "crab", "lobster", "octopus", "squid", "jellyfish", "coral", "reef", "sand", "shell", "wave", "tide", "surf", "breeze", "wind", "storm", "rain", "snow", "ice", "frost", "fire", "flame", "spark", "ash", "smoke", "coal", "rock", "stone", "pebble", "dust", "dirt", "soil", "mud", "clay", "sand", "glass", "metal", "iron", "steel", "gold", "silver", "copper", "brass", "bronze", "wood", "leaf", "branch", "root", "bark", "seed", "flower", "fruit", "berry", "nut", "cone", "mushroom", "fungus", "moss", "fern", "grass", "weed", "vine", "bush", "shrub", "plant", "herb", "spice", "salt", "pepper", "sugar", "honey"]

class AuthPayload(BaseModel):
    email: str
    password: Optional[str] = None
    name: Optional[str] = None
    recovery_phrase: Optional[str] = None

@app.post("/auth/register")
async def register(payload: AuthPayload, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password required.")
        
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
        
    hashed_password = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    phrase_words = [secrets.choice(WORDLIST) for _ in range(12)]
    recovery_phrase = " ".join(phrase_words)
    hashed_phrase = bcrypt.hashpw(recovery_phrase.encode(), bcrypt.gensalt()).decode()
    
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=email,
        hashed_password=hashed_password,
        recovery_phrase=hashed_phrase
    )
    db.add(new_user)
    
    # Create Profile
    new_profile = Profile(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=payload.name or "User",
        profession="General",
        custom_categories=json.dumps(["Groceries", "Restaurant", "Gas", "Bills", "Health", "Shopping", "Income"]),
        instructions="I prefer concise and direct answers."
    )
    db.add(new_profile)
    db.commit()
    
    jwt_token = jwt.encode({
        "sub": user_id, 
        "exp": int(datetime.utcnow().timestamp()) + (30 * 24 * 3600)
    }, JWT_SECRET, algorithm="HS256")
    
    return {"token": jwt_token, "recovery_phrase": recovery_phrase}

@app.post("/auth/login")
async def login(payload: AuthPayload, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password required.")

    user = db.query(User).filter(User.email == email).first()
    if not user or not bcrypt.checkpw(payload.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    jwt_token = jwt.encode({
        "sub": user.id, 
        "exp": datetime.utcnow().timestamp() + (30 * 24 * 3600)
    }, JWT_SECRET, algorithm="HS256")
    
    return {"token": jwt_token}

@app.post("/auth/reset-password")
async def reset_password(payload: AuthPayload, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if not email or not payload.recovery_phrase or not payload.password:
        raise HTTPException(status_code=400, detail="Email, recovery phrase, and new password are required.")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or recovery phrase.")
        
    if not bcrypt.checkpw(payload.recovery_phrase.strip().encode(), user.recovery_phrase.encode()):
        raise HTTPException(status_code=401, detail="Invalid recovery phrase.")
        
    hashed_password = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    user.hashed_password = hashed_password
    db.commit()
    return {"status": "success", "message": "Password updated successfully."}

bearer_scheme = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except Exception as e:
        log.warning(f"Rejected request — invalid JWT token. {e}")
        raise HTTPException(status_code=401, detail="Invalid token.")

# ── LLM ───────────────────────────────────────────────────────────────────────
log.info("Initialising OpenAI LLM …")

llm = ChatOpenAI(
    model=OPENAI_MODEL,
    openai_api_key=OPENAI_API_KEY,
    temperature=0.2,
)

# ── Prompts ───────────────────────────────────────────────────────────────────

ROUTER_PROMPT = PromptTemplate.from_template(
    """You are an intent classification engine for Zai, a Personal AI Banker.
Determine if the user's message is logging a financial transaction or asking a question about their finances.

Categories:
- FINANCE: The user is explicitly logging a financial transaction (e.g., spending money, receiving salary, paying EMI). (e.g., "I spent 150 on lunch", "Received 5000 salary")
- QUERY: The user is asking a question or requesting information about their spending or finances. (e.g., "What is my salary?", "How much did I spend on food?")

User message: {text}

Output ONLY the exact category name (FINANCE or QUERY)."""
)

router_chain = ROUTER_PROMPT | llm | StrOutputParser()

def build_dynamic_finance_chain(categories_list: list):
    categories_str = ", ".join(f'"{c}"' for c in categories_list)
    prompt = PromptTemplate.from_template(
        f"""You are Zai. Extract the financial details from the following statement and output them strictly as a raw JSON object with NO markdown formatting, NO backticks, and NO extra text.
Do not wrap it in ```json. Just output the curly braces.

Keys required:
- "amount": (float) the numeric amount
- "currency": (string) the currency symbol or code (e.g. "₹", "$", "€"). Default to "₹" if none specified.
- "category": (string) Pick ONE of these exact categories: {categories_str}. If none fit perfectly, pick the closest match or use "Other".
- "type": (string) MUST be "income" for words like "salary", "wages", "pay", "bonus", or "received". If the user says "Pay 5000", treat "Pay" as a noun (salary/income), not a verb (spending). MUST be "expense" for buying, bills, or "paid". MUST be "save" for investments.
- "description": (string) a brief description
- "date": (string) MUST use the exact ISO8601 format "YYYY-MM-DD" (e.g. "2026-06-13"). If no date is mentioned, use {{today}}. Never use words like "Yesterday".

User statement: {{text}}"""
    )
    return prompt | llm | StrOutputParser()

RAG_PROMPT = PromptTemplate.from_template(
    """You are Zai, a highly intelligent Personal AI Banker. Use the user's transaction history below to accurately answer their questions about their finances.
- Perform any required arithmetic flawlessly.
- If they ask about spending trends, analyze the data based on their specific profession and categories.
- If the context is insufficient, say so honestly.
- Be concise, professional, and conversational.
Today's date: {today}

--- User Profile ---
{profile}

--- Transaction History ---
{context}

--- Recent Conversation ---
{history}
--- End of Context ---

Question: {question}
Zai's answer:"""
)

def build_dynamic_rag_chain(user_id: str, db: Session):
    def fetch_finances(_):
        transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.date.desc()).all()
        if not transactions:
            return "No transactions logged yet."
        lines = []
        for t in transactions:
            lines.append(f"[{t.date}] {t.tx_type.upper()}: {t.amount} {t.currency} | Category: {t.category} | Desc: {t.description}")
        return "\n".join(lines)

    def load_profile(_):
        p = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not p:
            return "No profile."
        return f"User Name: {p.name}\nProfession: {p.profession}\nInstructions: {p.instructions}"

    return (
        {
            "context":  fetch_finances,
            "history":  lambda x: "\n".join(x.get("history", [])) if x.get("history") else "No recent history.",
            "question": lambda x: x["question"],
            "today":    lambda _: datetime.now().strftime("%Y-%m-%d"),
            "profile":  load_profile,
        }
        | RAG_PROMPT
        | llm
        | StrOutputParser()
    )

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class WebhookPayload(BaseModel):
    text: str
    source: Optional[str] = "api"
    history: Optional[List[str]] = None

class WebhookResponse(BaseModel):
    action: str
    message: str
    stored_fact: Optional[str] = None
    doc_id: Optional[str] = None
    error: Optional[str] = None

class ProfilePayload(BaseModel):
    name: str
    profession: str
    custom_categories: List[str]
    instructions: str
    
class TransactionEditPayload(BaseModel):
    amount: float
    category: str
    description: str

class TransactionDirectPayload(BaseModel):
    amount: float
    category: str
    description: str
    type: str

class ReportPayload(BaseModel):
    month: str

HARSH_REPORT_PROMPT = PromptTemplate.from_template(
    """You are Zai, an elite, highly strict, and brutally honest Personal AI Banker. 
The user has requested a Monthly Financial Report for {month}.

Here is their profile:
Name: {name}
Profession: {profession}

Here are their transactions for this month:
{transactions}

Write a brutally honest, strict, and highly analytical 3-paragraph financial report.
Paragraph 1: Executive Summary. State exactly how much they made vs spent. If they are bleeding cash, tell them directly.
Paragraph 2: Spending Analysis. Identify their worst spending habits this month. Call out specific categories where they wasted money. Be strict. However, praise them if they have logged 'Investment' transactions or saved money, as investing is highly commendable and critical for wealth building.
Paragraph 3: Action Plan. Give them a ruthless, actionable financial plan for next month based on their profession and current burn rate.

Format the output in clean Markdown. Be concise but impactful. Do not hold back."""
)

# ── Webhook Endpoint ──────────────────────────────────────────────────────────

@app.post("/webhook", response_model=WebhookResponse)
async def webhook(
    payload: WebhookPayload,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        text   = payload.text.strip()
        source = payload.source or "api"
        today  = datetime.now(IST).strftime("%A, %d %B %Y")
        history = payload.history or []

        log.info(f"Received payload | user={user_id} | source={source} | text={text!r}")

        if not text:
            return JSONResponse(status_code=400, content={"error": "'text' field must not be empty.", "action": "error", "message": "Empty text"})

        route_result = router_chain.invoke({"text": text}).strip().upper()
        
        route = "QUERY"
        if "FINANCE" in route_result:
            route = "FINANCE"

        if route == "FINANCE":
            # Load user's profile for custom categories
            profile = db.query(Profile).filter(Profile.user_id == user_id).first()
            base_categories = ["Food", "Transport", "Utilities", "Entertainment", "Shopping", "Salary", "Income", "Investment", "Groceries", "Other"]
            cat_list = base_categories.copy()
            if profile and profile.custom_categories:
                try:
                    custom = json.loads(profile.custom_categories)
                    cat_list.extend(custom)
                except:
                    pass
                    
            finance_chain = build_dynamic_finance_chain(cat_list)
            raw_json = finance_chain.invoke({"text": text, "today": datetime.now().strftime("%Y-%m-%d")}).strip()
            try:
                if raw_json.startswith("```"):
                    raw_json = raw_json.split("\n", 1)[1].rsplit("\n", 1)[0]
                tx_data = json.loads(raw_json)
            except json.JSONDecodeError as e:
                log.error(f"Failed to parse finance JSON: {raw_json} | Error: {e}")
                return WebhookResponse(
                    action="error",
                    message="I had trouble processing that transaction perfectly. Could you try rephrasing it?"
                )
            else:
                tx_id = str(uuid.uuid4())
                new_tx = Transaction(
                    id=tx_id,
                    user_id=user_id,
                    amount=abs(tx_data.get('amount', 0)),
                    currency=tx_data.get('currency', '₹'),
                    category=tx_data.get('category', 'Other'),
                    tx_type=tx_data.get('type', 'expense'),
                    description=tx_data.get('description', ''),
                    date=tx_data.get('date', today)
                )
                db.add(new_tx)
                db.commit()
                
                return WebhookResponse(
                    action="saved_finance",
                    message=f"Logged {tx_data.get('type')}: {tx_data.get('amount')} {tx_data.get('currency')} for {tx_data.get('category')}",
                    stored_fact=json.dumps(tx_data),
                    doc_id=tx_id,
                )

        # Step 3: QUERY
        rag_chain = build_dynamic_rag_chain(user_id, db)
        answer = rag_chain.invoke({"question": text, "history": history})
        log.info(f"RAG answer for [{user_id}]: {answer}")
        
        return WebhookResponse(
            action="answered",
            message=answer
        )
    except Exception as e:
        log.error(f"Webhook error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={
            "action": "error",
            "message": f"An internal error occurred: {str(e)}",
            "error": str(e)
        })

# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/profile")
async def get_profile(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    p = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not p:
        return {"name": "User", "profession": "General", "custom_categories": [], "instructions": ""}
    return {
        "name": p.name,
        "profession": p.profession,
        "custom_categories": json.loads(p.custom_categories) if p.custom_categories else [],
        "instructions": p.instructions
    }

@app.post("/api/profile")
async def update_profile(payload: ProfilePayload, user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    p = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not p:
        p = Profile(id=str(uuid.uuid4()), user_id=user_id)
        db.add(p)
        
    p.name = payload.name
    p.profession = payload.profession
    p.custom_categories = json.dumps(payload.custom_categories)
    p.instructions = payload.instructions
    db.commit()
    return {"status": "success"}

@app.get("/api/finances")
async def get_finances(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.created_at.desc()).all()
    res = []
    for t in transactions:
        res.append({
            "id": t.id,
            "amount": t.amount,
            "currency": t.currency,
            "category": t.category,
            "type": t.tx_type,
            "description": t.description,
            "date": t.date
        })
    return res

@app.delete("/api/finances/{tx_id}")
async def delete_finance(tx_id: str, user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == user_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    db.delete(t)
    db.commit()
    return {"action": "deleted", "tx_id": tx_id}

@app.post("/api/finances/direct")
async def add_finance_direct(payload: TransactionDirectPayload, user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    tx_type = payload.type.lower()
    amount = payload.amount
    
    # Smart Auto-Detection for Income
    income_keywords = ["salary", "income", "money received", "bonus", "dividend"]
    if any(kw in payload.category.lower() for kw in income_keywords):
        tx_type = "income"

    t = Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        amount=amount,
        category=payload.category,
        description=payload.description,
        tx_type=tx_type,
        date=datetime.now(IST).strftime("%Y-%m-%d")
    )
    db.add(t)
    db.commit()
    return {"action": "saved", "tx_id": t.id}

@app.put("/api/finances/{tx_id}")
async def edit_finance(tx_id: str, payload: TransactionEditPayload, user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == user_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found.")
        
    t.amount = payload.amount
    t.category = payload.category
    t.description = payload.description
    db.commit()
    return {"action": "updated", "tx_id": tx_id}


@app.post("/api/generate_report")
async def generate_report(payload: ReportPayload, user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    p = db.query(Profile).filter(Profile.user_id == user_id).first()
    name = p.name if p else "User"
    profession = p.profession if p else "General"
    
    all_tx = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    
    month_tx = [tx for tx in all_tx if tx.date.startswith(payload.month)]
            
    if not month_tx:
        return {"report": "No transactions logged for this month. Start tracking your money if you want to fix your finances."}
        
    tx_lines = [f"{t.tx_type.upper()}: {t.amount} {t.currency} | Category: {t.category} | Desc: {t.description}" for t in month_tx]
    tx_str = "\n".join(tx_lines)
    
    chain = HARSH_REPORT_PROMPT | llm | StrOutputParser()
    report = chain.invoke({
        "month": payload.month,
        "name": name,
        "profession": profession,
        "transactions": tx_str
    })
    
    return {"report": report}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "assistant": "Zai Multi-Tenant",
        "llm": OPENAI_MODEL,
        "timestamp": datetime.utcnow().isoformat(),
    }
