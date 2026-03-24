# Graph-Based Data Modeling & Query System 🧠

An intelligent, LLM-powered Context Graph System that unifies fragmented Order-to-Cash (O2C) SAP data into a visual knowledge graph, allowing users to trace business flows and query data using natural language.

## 🚀 The Problem it Solves
In real-world Enterprise Resource Planning (ERP) systems like SAP, data is highly fragmented. A single business transaction spans multiple disconnected tables: Sales Orders, Deliveries, Billing Documents, and Journal Entries. Tracing the full lifecycle of an order or finding anomalies (e.g., delivered but not billed) usually requires complex SQL joins or specialized technical knowledge.

This project solves that by transforming the relational data into an **interconnected Knowledge Graph** and overlaying an **AI Agent**. Business users can simply type questions like *"Trace Sales Order 151"* or *"Which products generate the most invoices?"* and the system dynamically writes the code to find the answer.

---

## 🏗️ Architecture & Technical Decisions

### 1. Database & Storage Choice: `SQLite` + `NetworkX`
Instead of using a heavy, resource-intensive graph database like Neo4j, this system uses a dual-engine in-memory architecture optimized for the provided context size:
- **SQLite**: The JSONL dataset is ingested into a local SQLite file. This provides a structured relational environment that the LLM agent can easily write and execute standard SQL queries against (for aggregations, counts, and statistical analysis).
- **NetworkX**: A Python graph library used to build the physical relationships (Nodes & Edges) in memory. It is incredibly fast for traversing connections (e.g., identifying the delivery and invoice connected to a specific sales order).

### 2. Backend API: `FastAPI`
Python is the industry standard for AI and Data engineering. FastAPI was chosen for its asynchronous performance and seamless integration with Pydantic, allowing us to quickly expose the Graph payload to the frontend and handle LLM WebSocket/HTTP chat requests.

### 3. Frontend: `React (Vite) + Tailwind CSS v4`
- **Visualization**: Used `react-force-graph-2d` to render the 700+ nodes using a physics-based force-directed layout. By mapping types to colors, users can visually differentiate Customers from Invoices instantly.
- **Aesthetic**: Implemented a modern "Glassmorphism" dark-mode UI using Tailwind CSS, moving away from generic default styles to give the application a premium, enterprise-ready feel.

---

## 🤖 LLM Strategy & Guardrails

### Orchestration: `LangChain` + `Groq`
The system utilizes **Groq's Llama-3.3-70b-versatile** model via `LangChain`. 
Instead of a standard Q&A RAG pipeline, the system uses a **Zero-Shot ReAct Agent**. 

The Agent is provided with specific **Tools**:
1. `Query_Database`: Triggered when the user asks analytical questions (e.g., "Highest number of billing documents?"). The LLM dynamically writes SQL, executes it against SQLite, reads the output, and formulates an answer.
2. `Trace_Entity_Flow`: Triggered when the user asks to "trace" or "find the flow" of a document. It invokes a NetworkX connected-components algorithm to find all linked entities across the supply chain.

### Security & Guardrails
A strict System Message is injected into the LLM's context window:
> *"You MUST ONLY answer questions related to the provided dataset (Sales Orders, Deliveries, Invoices, Payments, Products, Customers)... If the user asks a question entirely unrelated to business flows... politely refuse to answer."*

This acts as a hard boundary. If a user asks "What is the capital of France?", the agent completely rejects the prompt to prevent hallucination, prompt injection, or token-wastage on non-domain queries.

---

## ⚡ How to Run

### Prerequisites
- Node.js & npm
- Python 3.8+
- A Groq API Key

### 1. Start the Backend
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt # (or install dependencies manually as required)
```
Add your Groq API Key to `backend/.env`:
```env
GROQ_API_KEY=gsk_your_api_key_here
```
Run the application:
```bash
python database.py # Ingests JSONL data and prepares SQLite
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.
