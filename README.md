# Graph-Based Data Modeling & Query System 🧠

An intelligent, LLM-powered Context Graph System that unifies fragmented Order-to-Cash (O2C) SAP data into a visual knowledge graph, allowing users to trace business flows and query data using natural language.

---

## 🚀 The Problem it Solves

In real-world ERP systems like SAP, a single business transaction spans **multiple disconnected tables**: Sales Orders, Deliveries, Billing Documents, and Journal Entries. Tracing the full lifecycle of an order or finding anomalies (e.g., delivered but not billed) usually requires complex SQL joins.

This project solves that by transforming the relational data into an **interconnected Knowledge Graph** and overlaying an **AI Agent** capable of answering natural language questions dynamically.

---

## 🏗️ Architecture & Technical Decisions

### Database & Storage: `SQLite` + `NetworkX`
**Why not Neo4j?** The dataset fits in memory (~700 entities). Using SQLite gives us standard SQL for aggregations, while NetworkX provides lightning-fast graph traversal. This dual-engine approach avoids the overhead of a dedicated graph database while delivering both analytical and graph capabilities.

- **SQLite**: JSONL dataset → relational tables. The LLM dynamically generates SQL for analytical queries.
- **NetworkX**: Python in-memory `DiGraph` with 709 nodes and 799 edges. Used for flow tracing and connected-component analysis.

### Backend: `FastAPI` (Python)
Chosen for async performance and native Pydantic validation. Exposes two endpoints:
- `GET /api/graph` — Returns the full graph as JSON for the frontend visualizer
- `POST /api/chat` — Accepts NL queries, routes through LangChain agent, returns data-backed answers

### Frontend: `React (Vite)` + `Tailwind CSS v4`
- **Visualization**: `react-force-graph-2d` renders nodes with force-directed physics layout
- **Node Inspection**: Click any node to inspect its metadata (ID, type, label) and all connected edges
- **Color Legend**: Entity types are color-coded (SalesOrder=blue, Customer=pink, Delivery=amber, etc.)
- **Design**: Glassmorphism dark-mode UI for a premium enterprise feel

---

## 🤖 LLM Prompting Strategy

### Orchestration: `LangChain` + `Groq` (`llama-3.1-8b-instant`)
The system uses LangChain's **native Tool-Calling Agent** pattern (not the deprecated zero-shot-react method). The LLM receives the full database schema in its system prompt alongside few-shot SQL examples.

### Tools
| Tool | Purpose | Input |
|------|---------|-------|
| `query_database` | Analytical SQL queries (counts, aggregations, broken flows) | Valid SQL string |
| `trace_entity_flow` | Graph traversal for document lifecycle tracing | Entity ID (e.g., `SO_123`) |

### Few-Shot Examples Injected
The system prompt includes pre-validated SQL examples for:
1. **Highest billing products** — `GROUP BY material ORDER BY count(*) DESC`
2. **Row counts** — `SELECT COUNT(*) FROM table`
3. **Broken flows (delivered but not billed)** — `LEFT JOIN` with `IS NULL` check
4. **Billed without delivery** — Reverse `LEFT JOIN`

### SQL Auto-Correction
A runtime string-replacement layer fixes common LLM hallucinations (e.g., `product_id` → `product`).

---

## 🛡️ Guardrails

A strict system message constrains the agent:
> *"You MUST ONLY answer questions related to the provided dataset. If the user asks an unrelated question, politely refuse."*

- ✅ Rejects general knowledge ("What is the capital of France?")
- ✅ Rejects creative writing requests
- ✅ Blocks destructive SQL (DROP, DELETE)
- ✅ Only processes Order-to-Cash domain queries

---

## 📊 Graph Model

| Node Type | Count | Relationships |
|-----------|-------|---------------|
| SalesOrder | ~100 | Customer → PLACED → SalesOrder |
| Delivery | ~100 | SalesOrder → DELIVERED_VIA → Delivery |
| BillingDocument | ~100 | Delivery → BILLED_VIA → BillingDocument |
| AccountingDocument | ~100 | BillingDocument → POSTED_TO → AccountingDocument |
| Product | ~100 | SalesOrder → CONTAINS → Product |
| Payment | ~100 | AccountingDocument → CLEARED_BY → Payment |
| Customer | ~100 | Root entity for order flows |

**Total: 709 nodes, 799 edges**

---

## ⚡ How to Run

### Prerequisites
- Python 3.8+ & Node.js 18+
- [Groq API Key](https://console.groq.com) (free tier)

### Backend
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
GROQ_API_KEY=gsk_your_api_key_here
```

**Download the dataset** from [Google Drive](https://drive.google.com/file/d/1UqaLbFaveV-3MEuiUrzKydhKmkeC1iAL/view) and extract into `data/sap-o2c-data/`.

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 🧪 Example Queries to Try

| Query | Expected Behavior |
|-------|-------------------|
| "Which products have the highest billing documents?" | SQL aggregation on billing_document_items |
| "Trace the flow for billing document 90000000" | NetworkX graph traversal |
| "Find orders that were delivered but not billed" | LEFT JOIN broken-flow detection |
| "What is the capital of France?" | Guardrail rejection |

---

## 🛠️ Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | FastAPI + Python | Industry standard for AI/data |
| Database | SQLite | Lightweight, LLM-friendly SQL target |
| Graph Engine | NetworkX | In-memory, fast traversal |
| LLM | Groq (Llama 3.1 8B) | Free tier, blazing fast inference |
| Orchestration | LangChain (Tool-Calling Agent) | Structured tool execution |
| Frontend | React + Vite | Fast HMR, modern DX |
| Styling | Tailwind CSS v4 | Utility-first, rapid UI |
| Visualization | react-force-graph-2d | Physics-based graph rendering |
