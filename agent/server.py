"""
server.py — the bridge between the phone and the graph.

The browser holds the transcript and the screenshots; the key lives here and
never leaves this process. That split is the whole reason this is a server
and not a fetch from the page.

    .\\agent\\run.ps1            ->  http://127.0.0.1:8077
"""

import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from walle_agent import OPENROUTER_MODEL, run_walle

load_dotenv()

app = FastAPI(title="WALL·E agent")

# The simulator is served from a static file server on another port, so the
# browser treats this as cross-origin. Local origins only — this process
# holds an API key and should not be reachable from a page on the internet.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    text: str
    screens: List[str] = Field(default_factory=list)   # data: URLs or bare base64
    current_app: Optional[str] = None
    memory_context: str = ""
    identity_context: str = ""


class AskResponse(BaseModel):
    answer: str
    decision: Optional[Dict[str, Any]] = None
    observations: List[str] = Field(default_factory=list)
    iterations: int = 0


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "model": OPENROUTER_MODEL,
        "key": bool(os.getenv("OPENROUTER_API_KEY")),
    }


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest) -> AskResponse:
    result = run_walle(
        user_text=req.text,
        screen_images=req.screens,
        current_app=req.current_app,
        memory_context=req.memory_context,
        identity_context=req.identity_context,
    )
    return AskResponse(
        answer=result.get("final_answer") or "",
        decision=result.get("decision"),
        observations=result.get("observations") or [],
        iterations=result.get("iteration", 0),
    )
