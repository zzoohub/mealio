---
name: langgraph
description: |
  LangGraph patterns for AI agents and workflows.
  Use when: building ReAct agents, multi-agent systems, human-in-the-loop, state machines.
  Do not use for: simple LLM calls (use langchain directly).
  Workflow: Standalone or integrated with fastapi for API layer.
references:
  - examples.md    # Full pattern implementations with pitfalls
---

# LangGraph

**For latest LangGraph APIs, use context7.**

---

## Pattern Selection

```
Need to use tools?
├── Yes → ReAct Agent (create_react_agent)
└── No → Workflow patterns below

Sequential or parallel?
├── Sequential → Prompt Chaining
├── Parallel → Parallelization
└── Dynamic parallel → Orchestrator-Worker (Send)

Need human approval?
└── Yes → Human-in-the-Loop (interrupt + checkpointer)

Need output validation?
└── Yes → Evaluator-Optimizer (loop with max iterations)

Multiple specialized agents?
├── Central coordinator → Supervisor (Command)
├── Team hierarchy → Hierarchical (nested supervisors)
└── Peer collaboration → Network
```

---

## Critical Gotchas

### 1. State Reducer (Parallel Safety)

```python
from typing import Annotated
import operator

class State(TypedDict):
    messages: Annotated[list, operator.add]  # ✅ Accumulates from parallel nodes
    current_step: str                         # ❌ Last write wins
```

**Rule: Without reducer, parallel nodes overwrite each other. Use `Annotated[list, operator.add]` for shared fields.**

### 2. Human-in-the-Loop Requirements

```python
# ❌ Fails silently or crashes
graph = builder.compile()  # No checkpointer
graph.invoke(inputs)

# ✅ Required for interrupt
graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "user-123"}}
graph.invoke(inputs, config)
```

**Rule: `interrupt()` requires BOTH checkpointer AND thread_id. Missing either = fails.**

### 3. Infinite Loop Prevention

```python
# ❌ Infinite loop
def should_continue(state):
    if state["score"] == "pass":
        return "end"
    return "retry"  # Never exits if score never passes

# ✅ Max iterations
def should_continue(state):
    if state["score"] == "pass" or state["iterations"] >= 3:
        return "end"
    return "retry"
```

**Rule: Every conditional loop MUST have iteration counter.**

### 4. Node Return Value

```python
# ❌ State not updated
def my_node(state):
    result = process(state)
    # Forgot to return!

# ❌ Returns wrong type
def my_node(state):
    return "done"  # String, not dict

# ✅ Return state updates as dict
def my_node(state):
    return {"result": process(state), "iterations": state["iterations"] + 1}
```

**Rule: Nodes MUST return dict with state updates. None or wrong type = state unchanged.**

### 5. Conditional Edge Routing

```python
# ❌ Runtime error - "process" doesn't match node name "processor"
def route(state):
    return "process"

builder.add_node("processor", processor_fn)
builder.add_conditional_edges("classifier", route, ["processor"])

# ✅ Exact match
def route(state):
    return "processor"  # Matches node name exactly
```

**Rule: Route function return value MUST exactly match a node name in edge list.**

### 6. Missing END Edge

```python
# ❌ Graph hangs - no path to END
builder.add_edge("final_node", "somewhere_else")

# ✅ Explicit END
from langgraph.graph import END
builder.add_edge("final_node", END)
```

**Rule: Every execution path must eventually reach END.**

---

## Persistence

| Type | Scope | Implementation |
|------|-------|----------------|
| Short-term | Within conversation | `checkpointer` + `thread_id` |
| Long-term | Across conversations | `store` parameter |

```python
# Short-term (conversation memory)
graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "conv-123"}}

# Long-term (user memory across conversations)
from langgraph.store.memory import InMemoryStore
store = InMemoryStore()
graph = builder.compile(checkpointer=checkpointer, store=store)
```

**Rule: Use `InMemorySaver` for dev only. Production needs `PostgresSaver` or similar.**

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Graph never terminates | Missing END edge | Add `add_edge(node, END)` |
| Infinite loop | No max iterations | Add counter in state |
| "Node X not found" | Route returns wrong name | Match node names exactly |
| State not updated | Node returns None | Return dict |
| Interrupt fails | Missing checkpointer/thread_id | Add both |
| Parallel data loss | No reducer | Use `Annotated[list, operator.add]` |
| "Already resumed" | Calling invoke after interrupt without Command | Use `Command(resume=...)` |

---

## Debugging

```python
# Visualize graph structure
from IPython.display import Image
Image(graph.get_graph().draw_mermaid_png())

# Stream with debug info
for chunk in graph.stream(inputs, stream_mode="debug"):
    print(chunk)

# Inspect current state
state = graph.get_state(config)
print(state.values)
print(state.next)  # What nodes run next
```

---

## Quick Checklist

### Graph Structure
- [ ] Every path reaches END
- [ ] Route functions return exact node names
- [ ] Loops have max iteration counter

### State
- [ ] Parallel-updated fields use reducer
- [ ] Nodes return dict (not None)
- [ ] State schema matches node returns

### Persistence
- [ ] HITL has checkpointer + thread_id
- [ ] Production uses PostgresSaver (not InMemorySaver)

### Debugging
- [ ] Graph visualized before running
- [ ] Using stream_mode="debug" for issues
