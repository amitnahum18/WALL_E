"""
walle_agent.py — the WALL·E reasoning graph.

    START → OBSERVE → REASON ─┬→ ANSWER    → END
                              ├→ ASK_USER  → END
                              ├→ DELEGATE  → END
                              └→ EXECUTE → AFTER_ACTION ─┬→ OBSERVE (loop)
                                                         └→ ANSWER → END

The loop is the point. A chatbot answers once; an agent looks, decides,
acts, and looks again at what its action did. Keeping that shape from the
start means the automation and verification agents can be dropped in later
as sub-graphs behind `delegate` without touching the core.

The actions here are deliberately mock. Nothing in this file touches a real
device: `execute_action` records what the model asked for and hands it back.
The device layer is a separate concern and a separate risk.
"""

import json
import os
import re
from typing import Any, Dict, List, Literal, Optional, TypedDict

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

load_dotenv()


# ============================================================
# CONFIG
# ============================================================

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# Reading small UI text off a screenshot is the hard part of this job, and
# the cheap vision models are visibly worse at it — they guess plausible
# numbers instead of reading the ones that are there. Overridable, but the
# default should be a model that can actually see.
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o")
MAX_IMAGES = 4          # matches what the phone keeps per command


# ============================================================
# STATE
# ============================================================

class WalleState(TypedDict, total=False):
    # what the user said, as transcribed on the device
    user_text: Optional[str]

    # what was on screen while they said it — newest last
    screen_images: List[str]
    current_app: Optional[str]

    # working memory for this run
    observations: List[str]
    decision: Optional[Dict[str, Any]]
    action_result: Optional[str]
    final_answer: Optional[str]

    # loop control
    iteration: int
    max_iterations: int

    # room for the memory and identity agents to fill later
    memory_context: Optional[str]
    identity_context: Optional[str]


# ============================================================
# LLM
# ============================================================

_llm = None


def get_llm():
    """Built on first use so the module can be imported, and tested,
    without a key in the environment."""
    global _llm
    if _llm is None:
        if not OPENROUTER_API_KEY:
            raise RuntimeError(
                "OPENROUTER_API_KEY is missing — put it in agent/.env"
            )
        _llm = ChatOpenAI(
            model=OPENROUTER_MODEL,
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            temperature=0,
        )
    return _llm


def set_llm(llm):
    """Swap in a stub. The tests run the whole graph this way, with no
    network and no key."""
    global _llm
    _llm = llm


# ============================================================
# HELPERS
# ============================================================

def image_data_url(image: str) -> str:
    if image.startswith("data:image"):
        return image
    return f"data:image/jpeg;base64,{image}"


def text_of(content: Any) -> str:
    """Providers return either a string or a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "".join(parts)
    return str(content)


_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


def parse_decision(raw: str) -> Dict[str, Any]:
    """Models fence their JSON, prepend a sentence to it, or hand back
    prose. Fenced first, then the outermost braces, then give up and treat
    the whole thing as an answer — which is the right failure: the user
    still gets the words the model produced."""
    raw = (raw or "").strip()

    for candidate in _candidates(raw):
        try:
            value = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict) and "type" in value:
            return value

    return {
        "type": "answer",
        "reason": "model did not return the decision schema",
        "answer": raw,
        "action": None,
        "delegate": None,
    }


def _candidates(raw: str):
    yield raw
    fenced = _FENCE.search(raw)
    if fenced:
        yield fenced.group(1).strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end > start:
        yield raw[start:end + 1]


# ============================================================
# NODES
# ============================================================

def observe(state: WalleState) -> WalleState:
    """What the agent can see right now, recorded as a fact rather than
    inferred later."""
    images = state.get("screen_images") or []
    observation = {
        "current_app": state.get("current_app", "unknown"),
        "screens": len(images),
        "iteration": state.get("iteration", 0),
    }
    # a new list, never the caller's — mutating graph state in place is
    # how two runs end up sharing a history
    return {"observations": list(state.get("observations") or []) + [json.dumps(observation)]}


SYSTEM_PROMPT = """You are WALL·E, a personal agent running on the user's phone.

You are given what the user said and, usually, one or more screenshots of
what was on their screen as they said it. They are in time order and each
one is labelled. The LAST screenshot is what the user is looking at now:
people often start a question on one screen and open the right one while
they finish the sentence, so answer from the last screenshot unless the
question is plainly about an earlier one.

You may:
  answer    - reply to the user
  action    - ask the device to do one concrete thing
  delegate  - hand a genuinely complex task to a specialist agent
  ask_user  - ask for the one piece of information you are missing

Rules:
- Read the values straight off the screen. Numbers, names, times and units
  exactly as they appear — do not round them, translate them or fill in
  what you expect to be there.
- Never invent what is on the screen. If the screenshots do not show it,
  say so and say what you can see instead, so the user knows which screen
  you were given.
- Never take a destructive or irreversible action without asking first.
- Prefer a simple deterministic action over a delegation.
- Device control is not connected yet: an action is recorded but nothing
  happens and the screen does not move. So if what you need is not on the
  screen, do not try to navigate to it — answer with what you can see and
  say which screen the user would need to open.
- Answer in one or two spoken sentences: the specific values first, then
  any detail worth adding. This is heard, not read.

Return ONLY a JSON object, no prose around it, matching:

{
  "type": "answer" | "action" | "delegate" | "ask_user",
  "reason": "one short sentence",
  "answer": string or null,
  "action": {"name": string, "parameters": object} or null,
  "delegate": {"agent": string, "task": string} or null
}"""


def reason(state: WalleState) -> WalleState:
    images = (state.get("screen_images") or [])[-MAX_IMAGES:]

    context = f"""USER SAID:
{state.get('user_text') or ''}

CURRENT APP: {state.get('current_app') or 'unknown'}

OBSERVATIONS SO FAR:
{json.dumps((state.get('observations') or [])[-10:], indent=2)}

LAST ACTION RESULT:
{state.get('action_result') or 'none'}

MEMORY:
{state.get('memory_context') or ''}

IDENTITY:
{state.get('identity_context') or ''}"""

    # Labelled, because "the last image" is only obvious to us. Which screen
    # the user ended up on is the whole answer to a question like "what's
    # the weather", and models do not reliably infer order from position.
    parts: List[Dict[str, Any]] = [{"type": "text", "text": context}]
    for i, image in enumerate(images):
        last = i == len(images) - 1
        label = f"SCREENSHOT {i + 1} of {len(images)}"
        if last:
            label += " — the screen the user is on now"
        elif i == 0:
            label += " — the screen they were on when they started speaking"
        parts.append({"type": "text", "text": label})
        parts.append({
            "type": "image_url",
            "image_url": {"url": image_data_url(image)},
        })

    response = get_llm().invoke([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": parts},
    ])

    return {"decision": parse_decision(text_of(response.content))}


def route_decision(state: WalleState) -> Literal["answer", "execute", "delegate", "ask_user"]:
    decision = state.get("decision") or {}
    kind = decision.get("type", "answer")

    # an action decision with no action in it is not an action
    if kind == "action" and not (decision.get("action") or {}).get("name"):
        return "answer"
    if kind == "delegate" and not (decision.get("delegate") or {}).get("agent"):
        return "answer"

    return {
        "action": "execute",
        "delegate": "delegate",
        "ask_user": "ask_user",
    }.get(kind, "answer")


def answer(state: WalleState) -> WalleState:
    decision = state.get("decision") or {}
    text = decision.get("answer")

    if not text:
        # Reached by running out of iterations mid-loop. This is spoken to
        # someone waiting for an answer, so it says what they can do about
        # it — the step count and the raw action belong in the log.
        text = (
            "I could not work that out from what was on screen. "
            "Try opening the app you mean and asking again."
        )

    return {"final_answer": text}


def ask_user(state: WalleState) -> WalleState:
    decision = state.get("decision") or {}
    return {"final_answer": decision.get("answer") or "I need more information."}


def execute_action(state: WalleState) -> WalleState:
    """Mock on purpose. Real device control is a separate layer with its own
    permission model; this records the intent so the loop can be exercised
    end to end without anything being able to touch a device."""
    decision = state.get("decision") or {}
    action = decision.get("action") or {}
    name = action.get("name")
    params = action.get("parameters") or {}

    known = {"open_app", "tap", "type", "swipe", "scroll", "back", "home"}
    call = f"{name}({json.dumps(params, ensure_ascii=False)})"

    # Worded as a refusal, not a receipt. "REQUESTED: open_app(Weather)"
    # read like it had worked, so the model re-observed, found the same
    # screen it had just tried to leave, and asked again until the loop
    # ran out -- and the user got "I stopped after 5 steps" instead of an
    # answer. The result has to say the screen did not move.
    if name in known:
        result = (
            f"NOT EXECUTED: {call}. Device control is not connected yet, so "
            f"nothing happened and the screen has not changed. Do not ask for "
            f"it again — answer from what you can already see, and say what "
            f"the user would need to open themselves."
        )
    else:
        result = f"NOT EXECUTED: {call} is not an action this device knows."

    return {
        "action_result": result,
        "iteration": state.get("iteration", 0) + 1,
    }


def delegate(state: WalleState) -> WalleState:
    """Placeholder for the sub-graphs: automation, research, identity,
    verification. Each becomes its own compiled graph invoked here."""
    spec = (state.get("decision") or {}).get("delegate") or {}
    return {
        "final_answer": f"Delegated to {spec.get('agent', 'unknown')}: {spec.get('task', '')}"
    }


def after_action(state: WalleState) -> WalleState:
    return {
        "observations": list(state.get("observations") or [])
        + [f"Action result: {state.get('action_result')}"]
    }


def continue_after_action(state: WalleState) -> Literal["observe", "answer"]:
    if state.get("iteration", 0) >= state.get("max_iterations", 5):
        return "answer"
    return "observe"


# ============================================================
# GRAPH
# ============================================================

def build_graph():
    graph = StateGraph(WalleState)

    graph.add_node("observe", observe)
    graph.add_node("reason", reason)
    graph.add_node("answer", answer)
    graph.add_node("ask_user", ask_user)
    graph.add_node("execute", execute_action)
    graph.add_node("after_action", after_action)
    graph.add_node("delegate", delegate)

    graph.set_entry_point("observe")
    graph.add_edge("observe", "reason")
    graph.add_conditional_edges("reason", route_decision, {
        "answer": "answer",
        "execute": "execute",
        "delegate": "delegate",
        "ask_user": "ask_user",
    })
    graph.add_edge("execute", "after_action")
    graph.add_conditional_edges("after_action", continue_after_action, {
        "observe": "observe",
        "answer": "answer",
    })
    graph.add_edge("answer", END)
    graph.add_edge("ask_user", END)
    graph.add_edge("delegate", END)

    return graph.compile()


walle = build_graph()


# ============================================================
# PUBLIC API
# ============================================================

def run_walle(
    user_text: str,
    screen_images: Optional[List[str]] = None,
    current_app: Optional[str] = None,
    memory_context: str = "",
    identity_context: str = "",
    max_iterations: int = 5,
) -> Dict[str, Any]:
    state: WalleState = {
        "user_text": user_text,
        "screen_images": screen_images or [],
        "current_app": current_app,
        "observations": [],
        "decision": None,
        "action_result": None,
        "final_answer": None,
        "iteration": 0,
        "max_iterations": max_iterations,
        "memory_context": memory_context,
        "identity_context": identity_context,
    }
    # the loop can revisit nodes; the default recursion limit counts steps,
    # not iterations, so give it room for max_iterations passes
    return walle.invoke(state, {"recursion_limit": 4 * max_iterations + 10})


if __name__ == "__main__":
    out = run_walle(
        user_text="What do you see on my screen?",
        current_app="Demo",
    )
    print(out.get("final_answer", "No answer"))
