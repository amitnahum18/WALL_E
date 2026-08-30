"""
Runs the whole graph against a stubbed model: no key, no network, no cost.
What is being tested is the wiring — routing, the action loop, the iteration
ceiling, and the JSON parsing that decides whether any of it happens at all.

    python agent/test_agent.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import walle_agent as wa           # noqa: E402

PASS, FAIL = [], []


def check(name, got, want):
    (PASS if got == want else FAIL).append((name, got, want))


class StubLLM:
    """Replies with whatever the script says next, and records what it was
    asked — which is how the image plumbing gets verified."""

    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def invoke(self, messages):
        self.calls.append(messages)
        body = self.replies.pop(0) if self.replies else '{"type":"answer","answer":"done"}'

        class R:
            content = body
        return R()


def images_in(call):
    parts = call[1]["content"]
    return [p for p in parts if p.get("type") == "image_url"]


# ------------------------------------------------------------
# parsing — the model rarely returns clean JSON
# ------------------------------------------------------------

check("plain json",
      wa.parse_decision('{"type":"answer","answer":"hi"}')["answer"], "hi")

check("fenced json",
      wa.parse_decision('```json\n{"type":"answer","answer":"hi"}\n```')["answer"], "hi")

check("json with prose around it",
      wa.parse_decision('Sure!\n{"type":"answer","answer":"hi"}\nHope that helps')["answer"], "hi")

check("prose only falls back to an answer",
      wa.parse_decision("I think it says hello")["type"], "answer")

check("prose is kept as the answer",
      wa.parse_decision("I think it says hello")["answer"], "I think it says hello")

check("content blocks flatten",
      wa.text_of([{"type": "text", "text": "a"}, {"type": "text", "text": "b"}]), "ab")


# ------------------------------------------------------------
# a plain answer
# ------------------------------------------------------------

stub = StubLLM(['{"type":"answer","reason":"visible","answer":"A calculator."}'])
wa.set_llm(stub)

out = wa.run_walle(
    user_text="what is on my screen",
    screen_images=["data:image/jpeg;base64,AAAA", "BBBB"],
    current_app="Calculator",
)

check("answers", out["final_answer"], "A calculator.")
check("one model call", len(stub.calls), 1)
check("both screens sent", len(images_in(stub.calls[0])), 2)
check("bare base64 gets a data url",
      images_in(stub.calls[0])[1]["image_url"]["url"].startswith("data:image/jpeg;base64,"), True)
check("observed once", len(out["observations"]), 1)


# ------------------------------------------------------------
# action, then an answer built on the result
# ------------------------------------------------------------

stub = StubLLM([
    '{"type":"action","reason":"need the app open","action":{"name":"open_app","parameters":{"app":"Maps"}}}',
    '{"type":"answer","reason":"done","answer":"Maps is open."}',
])
wa.set_llm(stub)

out = wa.run_walle(user_text="open maps", current_app="Home")

check("loops back after acting", len(stub.calls), 2)
check("action recorded", out["action_result"], 'REQUESTED: open_app({"app": "Maps"})')
check("iterated once", out["iteration"], 1)
check("final answer after the action", out["final_answer"], "Maps is open.")
check("action result reached the second prompt",
      "REQUESTED: open_app" in stub.calls[1][1]["content"][0]["text"], True)


# ------------------------------------------------------------
# a model that only ever wants to act must still terminate
# ------------------------------------------------------------

stub = StubLLM(['{"type":"action","action":{"name":"tap","parameters":{"x":1,"y":2}}}'] * 20)
wa.set_llm(stub)

out = wa.run_walle(user_text="tap forever", max_iterations=3)

check("stopped at the ceiling", out["iteration"], 3)
check("still produced an answer", bool(out["final_answer"]), True)
check("and said why", "stopped after" in out["final_answer"], True)


# ------------------------------------------------------------
# malformed action, delegation, ask_user
# ------------------------------------------------------------

wa.set_llm(StubLLM(['{"type":"action","reason":"oops","answer":"never mind","action":null}']))
out = wa.run_walle(user_text="do something")
check("an action with no action is an answer", out["final_answer"], "never mind")

wa.set_llm(StubLLM(['{"type":"delegate","delegate":{"agent":"AutomationAgent","task":"book a table"}}']))
out = wa.run_walle(user_text="book a table")
check("delegates", out["final_answer"], "Delegated to AutomationAgent: book a table")

wa.set_llm(StubLLM(['{"type":"ask_user","answer":"Which calendar?"}']))
out = wa.run_walle(user_text="add an event")
check("asks back", out["final_answer"], "Which calendar?")


# ------------------------------------------------------------
# runs must not share history
# ------------------------------------------------------------

wa.set_llm(StubLLM(['{"type":"answer","answer":"one"}', '{"type":"answer","answer":"two"}']))
first = wa.run_walle(user_text="a")
second = wa.run_walle(user_text="b")
check("second run starts clean", len(second["observations"]), 1)
check("first run untouched", len(first["observations"]), 1)


# ------------------------------------------------------------

for name, got, want in PASS:
    print(f"PASS {name}")
for name, got, want in FAIL:
    print(f"FAIL {name}\n     got  {got!r}\n     want {want!r}")

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
