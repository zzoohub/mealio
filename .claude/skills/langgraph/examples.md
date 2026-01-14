# LangGraph Examples

Full pattern implementations with pitfalls.

---

## ReAct Agent (Tool-Using)

```python
from langgraph.prebuilt import create_react_agent

tools = [search_tool, calculator_tool]
agent = create_react_agent(model, tools)

result = agent.invoke({
    "messages": [{"role": "user", "content": "What's 25 * 4?"}]
})
```

**Pitfall: Agent stuck in loop**
- Cause: Tool keeps returning ambiguous results
- Fix: Add `max_iterations` or explicit stop condition in tool

---

## Prompt Chaining (Sequential)

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(State)
builder.add_node("generate", generate_fn)
builder.add_node("edit", edit_fn)
builder.add_node("review", review_fn)

builder.add_edge(START, "generate")
builder.add_edge("generate", "edit")
builder.add_edge("edit", "review")
builder.add_edge("review", END)  # Don't forget!

graph = builder.compile()
```

**Pitfall: Graph hangs**
- Cause: Forgot `add_edge(..., END)`
- Fix: Every chain must explicitly end

---

## Parallelization

```python
builder = StateGraph(State)
builder.add_node("task_a", task_a_fn)
builder.add_node("task_b", task_b_fn)
builder.add_node("aggregate", aggregate_fn)

# Fan-out from START
builder.add_edge(START, "task_a")
builder.add_edge(START, "task_b")

# Fan-in to aggregate
builder.add_edge(["task_a", "task_b"], "aggregate")
builder.add_edge("aggregate", END)
```

**Pitfall: Data loss from parallel nodes**
```python
# ❌ Last write wins
class State(TypedDict):
    results: list  # task_b overwrites task_a's results

# ✅ Use reducer
class State(TypedDict):
    results: Annotated[list, operator.add]  # Both results kept
```

---

## Routing (Conditional)

```python
def classify(state: State) -> State:
    # Classify input
    category = classifier.invoke(state["input"])
    return {"category": category}

def route_by_category(state: State) -> str:
    category = state["category"]
    if category == "technical":
        return "tech_handler"
    elif category == "billing":
        return "billing_handler"
    return "general_handler"

builder.add_node("classifier", classify)
builder.add_node("tech_handler", tech_fn)
builder.add_node("billing_handler", billing_fn)
builder.add_node("general_handler", general_fn)

builder.add_edge(START, "classifier")
builder.add_conditional_edges(
    "classifier",
    route_by_category,
    ["tech_handler", "billing_handler", "general_handler"]
)
# Each handler goes to END
builder.add_edge("tech_handler", END)
builder.add_edge("billing_handler", END)
builder.add_edge("general_handler", END)
```

**Pitfall: "Node not found" error**
- Cause: Route function returns string not in node list
- Fix: Return values must exactly match node names

---

## Orchestrator-Worker (Dynamic Parallel)

```python
from langgraph.types import Send

def orchestrator(state: State):
    # Analyze task and create subtasks
    subtasks = planner.invoke(state["input"])
    return {"subtasks": subtasks}

def assign_workers(state: State) -> list[Send]:
    # Dynamically spawn workers for each subtask
    return [
        Send("worker", {"task": task, "index": i})
        for i, task in enumerate(state["subtasks"])
    ]

def worker(state: State) -> dict:
    result = execute_task(state["task"])
    return {"results": [{"index": state["index"], "result": result}]}

def synthesizer(state: State) -> dict:
    # Combine all worker results
    sorted_results = sorted(state["results"], key=lambda x: x["index"])
    final = combine([r["result"] for r in sorted_results])
    return {"final_output": final}

builder.add_node("orchestrator", orchestrator)
builder.add_node("worker", worker)
builder.add_node("synthesizer", synthesizer)

builder.add_edge(START, "orchestrator")
builder.add_conditional_edges("orchestrator", assign_workers, ["worker"])
builder.add_edge("worker", "synthesizer")
builder.add_edge("synthesizer", END)
```

**Pitfall: Workers can't spawn more workers**
- Cause: Nested Send not supported
- Fix: Keep architecture flat, max 1 level of dynamic spawning

**Pitfall: Results out of order**
- Cause: Parallel execution, no ordering guarantee
- Fix: Include index in worker state, sort in synthesizer

---

## Evaluator-Optimizer (Reflection Loop)

```python
class State(TypedDict):
    draft: str
    feedback: str
    score: str
    iterations: Annotated[int, lambda a, b: b]  # Always use latest

def generate(state: State) -> dict:
    if state.get("feedback"):
        # Regenerate with feedback
        draft = generator.invoke({
            "previous": state["draft"],
            "feedback": state["feedback"]
        })
    else:
        draft = generator.invoke(state["input"])
    return {"draft": draft, "iterations": state.get("iterations", 0) + 1}

def evaluate(state: State) -> dict:
    evaluation = evaluator.invoke(state["draft"])
    return {"feedback": evaluation["feedback"], "score": evaluation["score"]}

def should_continue(state: State) -> str:
    # CRITICAL: Always have max iterations
    if state["score"] == "pass":
        return "end"
    if state["iterations"] >= 3:
        return "end"  # Give up after 3 tries
    return "retry"

builder.add_edge(START, "generate")
builder.add_edge("generate", "evaluate")
builder.add_conditional_edges(
    "evaluate",
    should_continue,
    {"retry": "generate", "end": END}
)
```

**Pitfall: Infinite loop**
- Cause: Evaluator never returns "pass"
- Fix: ALWAYS check iterations >= max

---

## Supervisor (Multi-Agent Coordination)

```python
from langgraph.types import Command
from typing import Literal

def supervisor(state: State) -> Command[Literal["researcher", "writer", "__end__"]]:
    # Decide which agent to call next
    decision = supervisor_llm.invoke({
        "task": state["task"],
        "history": state["messages"],
        "available_agents": ["researcher", "writer"]
    })
    
    if decision["complete"]:
        return Command(goto="__end__")
    
    return Command(
        goto=decision["next_agent"],
        update={"current_agent": decision["next_agent"]}
    )

def researcher(state: State) -> Command[Literal["supervisor"]]:
    result = research_agent.invoke(state)
    return Command(
        goto="supervisor",
        update={"messages": [{"role": "researcher", "content": result}]}
    )

def writer(state: State) -> Command[Literal["supervisor"]]:
    result = writer_agent.invoke(state)
    return Command(
        goto="supervisor",
        update={"messages": [{"role": "writer", "content": result}]}
    )

builder.add_node("supervisor", supervisor)
builder.add_node("researcher", researcher)
builder.add_node("writer", writer)

builder.add_edge(START, "supervisor")
# No add_edge needed - Command handles routing
```

**Pitfall: Supervisor never ends**
- Cause: Forgot to return `Command(goto="__end__")`
- Fix: Explicitly handle completion condition

---

## Human-in-the-Loop

```python
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver

def proposal_node(state: State) -> dict:
    proposal = generate_proposal(state["request"])
    return {"proposal": proposal}

def approval_node(state: State) -> Command[Literal["execute", "revise"]]:
    # Pause and wait for human
    response = interrupt({
        "type": "approval_request",
        "proposal": state["proposal"],
        "question": "Do you approve this proposal?"
    })
    
    if response["approved"]:
        return Command(goto="execute")
    else:
        return Command(
            goto="revise",
            update={"feedback": response.get("feedback", "Please revise")}
        )

def execute_node(state: State) -> dict:
    result = execute_proposal(state["proposal"])
    return {"result": result}

def revise_node(state: State) -> dict:
    revised = revise_proposal(state["proposal"], state["feedback"])
    return {"proposal": revised}

builder.add_node("proposal", proposal_node)
builder.add_node("approval", approval_node)
builder.add_node("execute", execute_node)
builder.add_node("revise", revise_node)

builder.add_edge(START, "proposal")
builder.add_edge("proposal", "approval")
# approval uses Command for routing
builder.add_edge("execute", END)
builder.add_edge("revise", "approval")  # Back to approval after revision

# CRITICAL: Must have checkpointer
graph = builder.compile(checkpointer=InMemorySaver())
```

### Running HITL

```python
# Initial run - will pause at interrupt
config = {"configurable": {"thread_id": "user-123"}}
result = graph.invoke({"request": "Deploy to production"}, config)
# result contains interrupt data

# Check what's pending
state = graph.get_state(config)
print(state.values["proposal"])  # See the proposal

# Resume with human decision
graph.invoke(
    Command(resume={"approved": True}),
    config
)
# or
graph.invoke(
    Command(resume={"approved": False, "feedback": "Add rollback plan"}),
    config
)
```

**Pitfall: "No checkpointer" error**
- Fix: `builder.compile(checkpointer=InMemorySaver())`

**Pitfall: "thread_id required" error**
- Fix: Include `{"configurable": {"thread_id": "xxx"}}` in config

**Pitfall: "Already resumed" error**
- Cause: Calling `invoke(inputs)` instead of `invoke(Command(resume=...))`
- Fix: After interrupt, always use `Command(resume=...)`

---

## Hierarchical Multi-Agent

```python
from langgraph_supervisor import create_supervisor

# Create sub-teams
research_team = create_supervisor(
    [search_agent, scraper_agent],
    model=model,
    prompt="You coordinate research tasks"
)

writing_team = create_supervisor(
    [writer_agent, editor_agent],
    model=model,
    prompt="You coordinate writing tasks"
)

# Create top-level supervisor
top_supervisor = create_supervisor(
    [research_team, writing_team],
    model=model,
    prompt="You coordinate the overall project"
)

result = top_supervisor.invoke({"task": "Write a report on AI trends"})
```

**Pitfall: Deep hierarchies are slow**
- Cause: Each level adds LLM calls
- Fix: Keep hierarchy ≤ 3 levels

**Pitfall: Context lost between levels**
- Cause: Each supervisor has own state
- Fix: Pass essential context explicitly in task description
