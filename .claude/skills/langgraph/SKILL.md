---
name: langgraph
description: "Design and build AI agents with LangGraph. Use when building ReAct agents, multi-agent systems, workflow orchestration, human-in-the-loop patterns, or state machine workflows."
---

# LangGraph Skill

LangGraph: Framework for stateful, multi-actor AI applications.

> **Latest Syntax**: Add `use context7` to your prompt for up-to-date LangGraph API docs

---

## Core Concepts

```python
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import create_react_agent, ToolNode, tools_condition
from langgraph.types import Command, interrupt, Send
from langgraph.checkpoint.memory import InMemorySaver
```

| Concept | Description |
|---------|-------------|
| **StateGraph** | Graph managing state. Updates state after each node execution |
| **MessagesState** | Built-in state for chat (includes messages list) |
| **Node** | Function that receives state, processes, returns updates |
| **Edge** | Transition between nodes. Static (add_edge) or conditional |
| **Checkpointer** | State persistence. Enables conversation history, pause/resume |
| **Command** | Dynamic routing + state update in one operation |
| **interrupt** | Pause execution for human-in-the-loop |
| **Send** | Dynamically create worker nodes (Orchestrator-Worker pattern) |

---

## Pattern Selection Guide

```
Q: Does agent need to use tools?
├─ Yes → ReAct Agent
└─ No → Workflow patterns

Q: Sequential or parallel tasks?
├─ Sequential → Prompt Chaining
├─ Parallel → Parallelization
└─ Both → Orchestrator-Worker

Q: Need different handling based on input?
└─ Yes → Routing

Q: Need quality validation of output?
└─ Yes → Evaluator-Optimizer (iterative refinement)

Q: Multiple specialized agents collaborating?
├─ Central coordination → Supervisor
├─ Hierarchical team structure → Hierarchical
└─ P2P collaboration → Network
```

---

## 1. ReAct Agent (Tool-Using Agent)

**Use case**: Autonomous agent where LLM decides whether to use tools

```
START → LLM → [Tool calls?] → Yes → Tools → LLM (loop)
                            → No  → END
```

```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(model, tools=[search, calculator])
result = agent.invoke({"messages": [{"role": "user", "content": "..."}]})

# For custom implementation: Context7 "react agent from scratch"
```

---

## 2. Prompt Chaining (Sequential)

**Use case**: Step-by-step processing (generate → edit → review)

```
START → Generate → Edit → Review → END
```

```python
builder = StateGraph(State)
builder.add_edge(START, "generate")
builder.add_edge("generate", "edit")
builder.add_edge("edit", "review")
builder.add_edge("review", END)
```

---

## 3. Parallelization

**Use case**: Execute independent tasks simultaneously, merge results

```
START ──┬── Task A ──┐
        ├── Task B ──┼── Aggregate → END
        └── Task C ──┘
```

```python
# Fan-out
builder.add_edge(START, "task_a")
builder.add_edge(START, "task_b")
builder.add_edge(START, "task_c")

# Fan-in
builder.add_edge("task_a", "aggregate")
builder.add_edge("task_b", "aggregate")
builder.add_edge("task_c", "aggregate")
```

---

## 4. Routing

**Use case**: Classify input and route to appropriate handler

```
START → Classifier → [Route] → Handler A/B/C → END
```

```python
def route_fn(state: State) -> str:
    return state["category"]  # "handler_a" | "handler_b" | "handler_c"

builder.add_conditional_edges("classifier", route_fn, 
    {"handler_a": "handler_a", "handler_b": "handler_b", "handler_c": "handler_c"})
```

---

## 5. Orchestrator-Worker (Send API)

**Use case**: Dynamically create subtasks and process in parallel

```
START → Orchestrator → [Send] → Worker 1..N → Synthesizer → END
```

```python
from langgraph.types import Send

def assign_workers(state: State):
    return [Send("worker", {"task": t}) for t in state["tasks"]]

builder.add_conditional_edges("orchestrator", assign_workers, ["worker"])
```

---

## 6. Evaluator-Optimizer (Reflection Loop)

**Use case**: Generate → evaluate → incorporate feedback → regenerate

```
START → Generate → Evaluate → [Pass?] → Yes → END
                                      → No  → Generate (with feedback)
```

```python
def should_continue(state: State) -> str:
    if state["score"] == "pass" or state["iterations"] >= 3:
        return "end"
    return "retry"

builder.add_conditional_edges("evaluate", should_continue, 
    {"retry": "generate", "end": END})
```

---

## 7. Multi-Agent: Supervisor

**Use case**: Central coordinator delegates to specialized agents

```
START → Supervisor ←→ Agent A/B/C → END
```

```python
from langgraph.types import Command

def supervisor(state) -> Command[Literal["agent_a", "agent_b", "__end__"]]:
    next_agent = decide_next(state)
    return Command(goto=next_agent)

# Or use langgraph-supervisor library
from langgraph_supervisor import create_supervisor
supervisor = create_supervisor([agent_a, agent_b], model=model)
```

---

## 8. Multi-Agent: Hierarchical

**Use case**: Team-based hierarchy (team lead → team members)

```python
research_team = create_supervisor([search_agent, scraper_agent], model=model)
writing_team = create_supervisor([writer_agent, editor_agent], model=model)
top_supervisor = create_supervisor([research_team, writing_team], model=model)
```

---

## 9. Human-in-the-Loop

**Use case**: Human approval before critical actions, state editing, input requests

```python
from langgraph.types import interrupt, Command

def approval_node(state) -> Command[Literal["proceed", "cancel"]]:
    response = interrupt({"question": "Approve?", "data": state["action"]})
    return Command(goto="proceed" if response["approved"] else "cancel")

# Required: checkpointer
graph = builder.compile(checkpointer=InMemorySaver())

# Resume from interrupt
result = graph.invoke(inputs, {"configurable": {"thread_id": "1"}})
graph.invoke(Command(resume={"approved": True}), config)
```

**Interrupt patterns**: Approve/Reject, Edit State, Review Tool Calls

---

## Persistence (Memory)

| Type | Purpose | Implementation |
|------|---------|----------------|
| **Short-term** | Context within conversation | `checkpointer` + `thread_id` |
| **Long-term** | Shared across conversations | `store` |

```python
from langgraph.checkpoint.memory import InMemorySaver  # Dev
from langgraph.checkpoint.postgres import PostgresSaver  # Production

checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)
config = {"configurable": {"thread_id": "user-123"}}
```

**Production**: `PostgresSaver`, `SqliteSaver`, `MongoDBSaver`, `RedisSaver`

---

## State & Tools

```python
# State definition
class State(TypedDict):
    messages: Annotated[list, operator.add]  # Reducer: accumulate
    current_step: str                         # Replace: overwrite

# For chat: use MessagesState (includes messages)

# Tool definition
@tool
def search(query: str) -> str:
    """Perform web search."""
    return search_api(query)
```

---

## Streaming & Debugging

```python
# Streaming: stream_mode="values" | "updates" | "debug"
for chunk in graph.stream(inputs, stream_mode="values"): print(chunk)

# Visualization
Image(graph.get_graph().draw_mermaid_png())

# State inspection
graph.get_state(config).values
```

**Common issues**: Missing END edge, infinite loops, node not returning dict, route function return mismatch

---

## Latest Syntax Reference

For up-to-date API details, add `use context7` to your prompt.
Context7 MCP will automatically fetch current LangGraph documentation.
