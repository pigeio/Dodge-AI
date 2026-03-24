import os
import sqlite3
import networkx as nx
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from database import DB_PATH, global_graph

load_dotenv()

def get_db_schema():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table';")
        schema = "\n".join([row[0] for row in cursor.fetchall() if row[0]])
        conn.close()
        return schema
    except:
        return "Schema unavailable"

# We can use Gemini or Groq depending on what's available
def get_llm():
    if os.getenv("GROQ_API_KEY"):
        return ChatGroq(model_name="llama-3.1-8b-instant", temperature=0)
    return None

@tool
def query_database(query: str) -> str:
    """You MUST pass a valid SQL query string to this tool. Executes a SQL query against the SQLite database. Useful for analytical questions. The tables are: sales_order_headers, sales_order_items, outbound_delivery_headers, billing_document_headers, products, etc. Example input: 'SELECT count(*) FROM products;'"""
    query = query.replace("product_id", "product").replace("material_id", "material")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        conn.close()
        
        if not result:
            return "No results found."
            
        res_str = f"Columns: {', '.join(columns)}\n"
        for row in result[:20]: # limit to 20 for context size
            res_str += str(row) + "\n"
        return res_str
    except Exception as e:
        return f"SQL Error: {e}"

@tool
def trace_entity_flow(entity_id: str) -> str:
    """You MUST pass a single Entity ID to this tool (e.g. 'SO_123', 'BILL_456'). Traces the flow of a document in the graph."""
    if not global_graph.has_node(entity_id):
        # Maybe the user didn't provide the exact prefix. Let's try guessing:
        possible_nodes = [n for n in global_graph.nodes() if entity_id in n]
        if not possible_nodes:
            return f"Entity {entity_id} not found in the graph."
        entity_id = possible_nodes[0]
        
    # Get connected component or just neighbors up to degree 2
    try:
        # Undirected version for path finding
        undir_G = global_graph.to_undirected()
        connected = nx.node_connected_component(undir_G, entity_id)
        
        # Limit the size so we don't overwhelm the LLM
        if len(connected) > 50:
            connected = list(connected)[:50]
            
        subgraph = global_graph.subgraph(connected)
        
        trace = []
        for u, v, data in subgraph.edges(data=True):
            trace.append(f"{u} -[{data.get('relation', 'connected')}]-> {v}")
            
        return "\n".join(trace)
    except Exception as e:
        return f"Graph Traversal Error: {e}"



SYSTEM_PROMPT = """
You are a context graph assistant for an SAP Order-to-Cash system. 
You can help users trace business flows, identify broken processes, and query analytical data.

IMPORTANT GUARDRAILS:
1. You MUST ONLY answer questions related to the provided dataset (Sales Orders, Deliveries, Invoices, Payments, Products, Customers).
2. If the user asks a question entirely unrelated to business flows, the dataset, or system data (e.g., general knowledge, creative writing), politely refuse to answer. Example: "This system is designed to answer questions related to the provided dataset only."
3. Do not formulate destructive SQL queries (DROP, DELETE).

If tracing a flow, Use the Trace_Entity_Flow tool. If aggregating, use the Query_Database tool.
"""

def generate_response(user_query: str) -> str:
    llm = get_llm()
    if not llm:
        return "System Error: No LLM API key detected. Please add GEMINI_API_KEY or GROQ_API_KEY to the .env file."
        
    tools = [query_database, trace_entity_flow]
    
    schema_str = get_db_schema().replace("{", "{{").replace("}", "}}")
    final_system_prompt = SYSTEM_PROMPT + f"\n\nCRITICAL SQL RULES & EXAMPLES:\n- The 'products' table uses 'product' as its ID column.\n- In item tables (sales_order_items, billing_document_items), the product ID is called 'material'.\n- NEVER use 'product_id' or 'material_id'.\n- Example 1 (Highest billing products):\n  SELECT material as product, count(*) as billing_count FROM billing_document_items GROUP BY material ORDER BY billing_count DESC LIMIT 10;\n- Example 2 (Row counts):\n  SELECT COUNT(*) FROM sales_order_headers;\n\nDATABASE SCHEMA FOR SQL QUERIES:\n{schema_str}"
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", final_system_prompt),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    
    try:
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=False, max_iterations=8)
        response = agent_executor.invoke({"input": user_query})
        return response["output"]
    except Exception as e:
        return f"Error resolving query: {str(e)}"
