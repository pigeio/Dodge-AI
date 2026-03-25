import os
import json
import sqlite3
import pandas as pd
import networkx as nx

DB_PATH = "sap_data.db"
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "sap-o2c-data")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    return conn

def import_data_to_sqlite():
    if os.path.exists(DB_PATH):
        # Already imported
        return
    if not os.path.exists(DATA_DIR):
        print(f"Data directory not found at {DATA_DIR}. Skipping import.")
        return
    print("Importing JSONL data into SQLite...")
    conn = init_db()
    
    for folder in os.listdir(DATA_DIR):
        folder_path = os.path.join(DATA_DIR, folder)
        if not os.path.isdir(folder_path):
            continue
        
        table_name = folder
        files = [f for f in os.listdir(folder_path) if f.endswith('.jsonl')]
        
        all_dfs = []
        for file in files:
            file_path = os.path.join(folder_path, file)
            # Read JSONL using pandas
            try:
                df = pd.read_json(file_path, lines=True)
                all_dfs.append(df)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                
        if all_dfs:
            combined_df = pd.concat(all_dfs, ignore_index=True)
            # Convert unsupported types (like dict, list, datetime) to string
            for col in combined_df.columns:
                if combined_df[col].dtype == 'object' or 'datetime' in str(combined_df[col].dtype):
                    combined_df[col] = combined_df[col].astype(str)
                    
            # Write safely to sqlite, drop if exists
            combined_df.to_sql(table_name, conn, if_exists="replace", index=False)
            print(f"Imported {len(combined_df)} rows into table: {table_name}")
            
    conn.close()
    print("Data import complete.")

def build_graph():
    """
    Builds the NetworkX graph from SQLite.
    Returns a NetworkX DiGraph.
    """
    conn = init_db()
    G = nx.DiGraph()
    
    print("Building context graph...")
    
    # helper query
    def query_to_df(query):
        return pd.read_sql_query(query, conn)

    try:
        # Load Entities (Nodes)
        # Sales Orders
        so_df = query_to_df("SELECT salesOrder, soldToParty FROM sales_order_headers")
        for _, row in so_df.iterrows():
            G.add_node(f"SO_{row['salesOrder']}", type="SalesOrder", label=f"Order {row['salesOrder']}")
            if row['soldToParty']:
                G.add_node(f"CUST_{row['soldToParty']}", type="Customer", label=f"Cust {row['soldToParty']}")
                G.add_edge(f"CUST_{row['soldToParty']}", f"SO_{row['salesOrder']}", relation="PLACED")

        # Deliveries
        del_df = query_to_df("SELECT deliveryDocument FROM outbound_delivery_headers")
        for _, row in del_df.iterrows():
            G.add_node(f"DEL_{row['deliveryDocument']}", type="Delivery", label=f"Del {row['deliveryDocument']}")
            
        # Deliveries mapped to Sales Orders
        del_items = query_to_df("SELECT deliveryDocument, referenceSdDocument FROM outbound_delivery_items WHERE referenceSdDocument IS NOT NULL")
        for _, row in del_items.iterrows():
            G.add_edge(f"SO_{row['referenceSdDocument']}", f"DEL_{row['deliveryDocument']}", relation="DELIVERED_VIA")

        # Billing Documents
        bill_df = query_to_df("SELECT billingDocument, accountingDocument FROM billing_document_headers")
        for _, row in bill_df.iterrows():
            G.add_node(f"BILL_{row['billingDocument']}", type="BillingDocument", label=f"Bill {row['billingDocument']}")
            if row['accountingDocument']:
                G.add_node(f"ACC_{row['accountingDocument']}", type="AccountingDocument", label=f"Acc {row['accountingDocument']}")
                G.add_edge(f"BILL_{row['billingDocument']}", f"ACC_{row['accountingDocument']}", relation="POSTED_TO")

        # Billing mapped to Deliveries or Sales Orders
        bill_items = query_to_df("SELECT billingDocument, referenceSdDocument FROM billing_document_items WHERE referenceSdDocument IS NOT NULL")
        for _, row in bill_items.iterrows():
            ref = row['referenceSdDocument']
            # Could reference an order or a delivery. Just map to both possibilities, one will match if it exists.
            # We'll just link to node IDs if they exist in the graph to be safe.
            del_id = f"DEL_{ref}"
            so_id = f"SO_{ref}"
            if G.has_node(del_id):
                G.add_edge(del_id, f"BILL_{row['billingDocument']}", relation="BILLED_VIA")
            elif G.has_node(so_id):
                G.add_edge(so_id, f"BILL_{row['billingDocument']}", relation="BILLED_VIA")

        # Products
        prod_df = query_to_df("SELECT product, productType FROM products")
        for _, row in prod_df.iterrows():
            G.add_node(f"PROD_{row['product']}", type="Product", label=f"Prod {row['product']}")
            
        # Products in Sales Orders
        so_items = query_to_df("SELECT salesOrder, material FROM sales_order_items")
        for _, row in so_items.iterrows():
            G.add_edge(f"SO_{row['salesOrder']}", f"PROD_{row['material']}", relation="CONTAINS")
            
        # Payments
        pay_df = query_to_df("SELECT accountingDocument, clearingAccountingDocument FROM payments_accounts_receivable")
        for _, row in pay_df.iterrows():
            pay_node = f"PAY_{row['accountingDocument']}"
            G.add_node(pay_node, type="Payment", label=f"Pay {row['accountingDocument']}")
            if row['clearingAccountingDocument']:
                G.add_edge(f"ACC_{row['clearingAccountingDocument']}", pay_node, relation="CLEARED_BY")

    except Exception as e:
        print("Warning: Could not build full graph (tables might be missing).", e)

    conn.close()
    
    print(f"Graph built with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges.")
    return G

# Initialize when module is imported
import_data_to_sqlite()
global_graph = build_graph()
