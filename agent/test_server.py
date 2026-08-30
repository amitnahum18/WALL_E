"""
Exercises the HTTP surface the phone actually calls, with the model stubbed.

    python agent/test_server.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient     # noqa: E402

import walle_agent as wa                      # noqa: E402
import server                                 # noqa: E402

PASS, FAIL = [], []


def check(name, got, want):
    (PASS if got == want else FAIL).append((name, got, want))


class StubLLM:
    def __init__(self, body):
        self.body = body
        self.calls = []

    def invoke(self, messages):
        self.calls.append(messages)

        class R:
            content = self.body
        return R()


client = TestClient(server.app)

# ------------------------------------------------------------
res = client.get("/health")
check("health responds", res.status_code, 200)
check("health reports the model", "model" in res.json(), True)

# ------------------------------------------------------------
stub = StubLLM('{"type":"answer","reason":"read it","answer":"It says 42."}')
wa.set_llm(stub)

res = client.post("/ask", json={
    "text": "what does the screen say",
    "screens": ["data:image/jpeg;base64,AAAA"],
    "current_app": "Calculator",
})

check("ask responds", res.status_code, 200)
body = res.json()
check("answer comes back", body["answer"], "It says 42.")
check("decision comes back", body["decision"]["type"], "answer")
check("iterations reported", body["iterations"], 0)

parts = stub.calls[0][1]["content"]
check("the screenshot was forwarded",
      sum(1 for p in parts if p.get("type") == "image_url"), 1)
check("the app name was forwarded", "Calculator" in parts[0]["text"], True)

# ------------------------------------------------------------
# Which screen the user ended up on is often the whole answer, so the
# frames go over labelled and in order rather than as a bare pile.
stub = StubLLM('{"type":"answer","answer":"It is 24 degrees."}')
wa.set_llm(stub)
client.post("/ask", json={
    "text": "what is the weather",
    "screens": ["data:image/jpeg;base64,AAAA",
                "data:image/jpeg;base64,BBBB",
                "data:image/jpeg;base64,CCCC"],
})

parts = stub.calls[0][1]["content"]
labels = [p["text"] for p in parts if p.get("type") == "text"][1:]
images = [p["image_url"]["url"] for p in parts if p.get("type") == "image_url"]

check("every screenshot is labelled", len(labels), 3)
check("frames keep their order", images[-1].endswith("CCCC"), True)
check("the first is named as where they started",
      "started speaking" in labels[0], True)
check("the last is named as where they are now",
      "on now" in labels[-1], True)
check("a label sits before its image",
      parts.index(next(p for p in parts if p.get("type") == "image_url")) > 1, True)

# ------------------------------------------------------------
# a request with no screens is normal, not an error
wa.set_llm(StubLLM('{"type":"answer","answer":"I cannot see your screen."}'))
res = client.post("/ask", json={"text": "what is on my screen"})
check("no screens still answers", res.status_code, 200)
check("and says so", res.json()["answer"], "I cannot see your screen.")

# ------------------------------------------------------------
# the browser's preflight must survive CORS
res = client.options("/ask", headers={
    "Origin": "http://localhost:5173",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
})
check("preflight allowed", res.status_code, 200)
check("origin echoed back",
      res.headers.get("access-control-allow-origin"), "http://localhost:5173")

# a page on the internet must not be able to reach a process holding a key
res = client.options("/ask", headers={
    "Origin": "https://evil.example.com",
    "Access-Control-Request-Method": "POST",
})
check("remote origin refused",
      res.headers.get("access-control-allow-origin"), None)

# ------------------------------------------------------------
# a bad body is a 422, not a crash
res = client.post("/ask", json={"screens": []})
check("missing text is rejected", res.status_code, 422)

# ------------------------------------------------------------
for name, got, want in PASS:
    print(f"PASS {name}")
for name, got, want in FAIL:
    print(f"FAIL {name}\n     got  {got!r}\n     want {want!r}")

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
