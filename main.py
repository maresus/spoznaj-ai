import os
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.core.config import Settings
from app.core.chat_service import get_reply, stream_reply
from app.core.db import init_db, get_sessions, get_messages, get_stats, get_conversation_pairs

load_dotenv()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "info@spoznaj-ai.si")
SMTP_HOST   = os.getenv("SMTP_HOST", "")
SMTP_PORT   = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER   = os.getenv("SMTP_USER", "")
SMTP_PASS   = os.getenv("SMTP_PASS", "")
FROM_EMAIL  = os.getenv("FROM_EMAIL", SMTP_USER)

_inquiries: list[dict] = []

settings = Settings()
app = FastAPI(title=settings.project_name)

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    reply: str


class InquiryRequest(BaseModel):
    ime: str
    telefon: str
    email: str
    zanima: str | None = None
    sporocilo: str | None = None


def _send_email(to: str, subject: str, html: str) -> bool:
    if not SMTP_HOST or not SMTP_USER or not to:
        print(f"[email] SMTP ni konfiguriran — preskočeno")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(FROM_EMAIL, to, msg.as_string())
        return True
    except Exception as e:
        print(f"[email] Napaka: {e}")
        return False


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def chat_ui() -> HTMLResponse:
    html_path = Path("static/chat.html")
    if not html_path.exists():
        return HTMLResponse("<h1>chat.html ni najden</h1>", status_code=500)
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))


@app.get("/widget", response_class=HTMLResponse)
def widget_ui() -> HTMLResponse:
    html_path = Path("static/widget.html")
    if not html_path.exists():
        return HTMLResponse("<h1>widget.html ni najden</h1>", status_code=500)
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))


@app.post("/chat/", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    reply = get_reply(req.session_id, req.message)
    return ChatResponse(reply=reply)


@app.post("/chat/stream")
def chat_stream(req: ChatRequest) -> StreamingResponse:
    return StreamingResponse(stream_reply(req.session_id, req.message), media_type="text/plain")


@app.post("/chat/inquiry")
def submit_inquiry(payload: InquiryRequest):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    _inquiries.append({
        "ime": payload.ime, "telefon": payload.telefon, "email": payload.email,
        "zanima": payload.zanima or "—", "sporocilo": payload.sporocilo or "—", "created_at": ts
    })

    navy = "#0B3149"
    lime = "#A6CE39"

    admin_html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:{navy};padding:24px;border-radius:8px 8px 0 0;">
      <h2 style="color:{lime};margin:0;">Novo povpraševanje — SpoznajAI</h2>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">{ts} UTC</p>
    </div>
    <div style="background:#f8f9fa;padding:24px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#666;width:140px;"><b>Ime</b></td><td>{payload.ime}</td></tr>
        <tr><td style="padding:8px 0;color:#666;"><b>Telefon</b></td><td><a href="tel:{payload.telefon}" style="color:{navy};">{payload.telefon}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666;"><b>Email</b></td><td><a href="mailto:{payload.email}" style="color:{navy};">{payload.email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666;"><b>Zanima</b></td><td>{payload.zanima or "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#666;vertical-align:top;"><b>Sporočilo</b></td><td>{payload.sporocilo or "—"}</td></tr>
      </table>
    </div>
    </body></html>"""
    _send_email(ADMIN_EMAIL, f"Povpraševanje SpoznajAI: {payload.ime}", admin_html)

    confirm_html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:{navy};padding:24px;border-radius:8px 8px 0 0;">
      <h2 style="color:{lime};margin:0;">Hvala, {payload.ime}!</h2>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">SpoznajAI — AI za podjetja v Sloveniji</p>
    </div>
    <div style="background:#f8f9fa;padding:24px;border:1px solid #e0e0e0;border-radius:0 0 8px 8px;">
      <p>Prejeli smo vaše povpraševanje. Odgovorimo v enem delovnem dnevu.</p>
      <div style="background:{navy};color:#fff;padding:16px;border-radius:8px;margin:20px 0;">
        <b>Kontakt:</b><br>
        ✉ info@spoznaj-ai.si<br>
        📞 041 792 578 · 030 250 528<br>
        📍 Maribor, Slovenija
      </div>
      <p style="color:#999;font-size:12px;">spoznaj-ai.si</p>
    </div>
    </body></html>"""
    _send_email(payload.email, "Potrditev povpraševanja — SpoznajAI", confirm_html)

    return {"ok": True}


@app.get("/api/admin/conversations")
def api_conversations(hours: int = Query(default=168), limit: int = Query(default=1000)):
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    pairs = get_conversation_pairs(cutoff=cutoff, limit=limit)
    return {"conversations": pairs, "total": len(pairs)}


@app.get("/api/admin/inquiries")
def api_inquiries():
    return {"inquiries": _inquiries, "total": len(_inquiries)}


@app.get("/admin", response_class=HTMLResponse)
def admin_ui() -> HTMLResponse:
    html_path = Path("static/admin.html")
    if not html_path.exists():
        return HTMLResponse("<h1>admin.html ni najden</h1>", status_code=500)
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))


@app.get("/admin/stats")
def admin_stats() -> dict:
    return get_stats()


@app.get("/admin/sessions")
def admin_sessions() -> list:
    return get_sessions()


@app.get("/admin/sessions/{session_id}")
def admin_session_detail(session_id: str) -> list:
    return get_messages(session_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
