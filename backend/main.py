import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import networkx as nx
from database import global_graph, init_db
import pandas as pd
from llm_agent import generate_response

app = FastAPI(title="Graph Query API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

@app.get("/api/graph")
def get_graph_data():
    """ Returns a JSON representation of the NetworkX graph for react-force-graph """
    # For very large graphs, we might need to limit this. 
    # For now, return up to 2000 nodes to prevent browser crash.
    nodes = []
    edges = []
    
    node_count = 0
    node_set = set()
    
    for n, data in global_graph.nodes(data=True):
        if node_count >= 1000:
            break
        nodes.append({"id": n, "label": data.get("label", n), "type": data.get("type", "Unknown")})
        node_set.add(n)
        node_count += 1
        
    for u, v, data in global_graph.edges(data=True):
        if u in node_set and v in node_set:
            edges.append({"source": u, "target": v, "label": data.get("relation", "")})
            
    return {"nodes": nodes, "links": edges}

@app.post("/api/chat")
def chat_with_system(req: QueryRequest):
    response_text = generate_response(req.query)
    return {"reply": response_text}

@app.get("/health")
def health():
    return {"status": "ok"}
