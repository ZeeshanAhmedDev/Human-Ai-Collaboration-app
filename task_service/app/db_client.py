# from pymongo import MongoClient
# import os
# from dotenv import load_dotenv

# load_dotenv()

# MONGO_URI = os.getenv("MONGO_URI")
# DB_NAME = os.getenv("DB_NAME", "ai_collab_team")

# if not MONGO_URI:
#     raise ValueError("❌ Missing MONGO_URI. Please check your .env file.")

# client = MongoClient(MONGO_URI)
# db = client[DB_NAME]
# tasks = db["tasks"]

# def save_task(task_data):
#     result = tasks.insert_one(task_data)
#     return str(result.inserted_id)



# from pymongo import MongoClient
# from dotenv import load_dotenv
# import os

# load_dotenv()

# MONGO_URI = os.getenv("MONGO_URI")
# DB_NAME = os.getenv("DB_NAME", "ai_collab_team")

# client = MongoClient(MONGO_URI)
# db = client[DB_NAME]
# tasks = db["tasks"]

# def save_task(task_data: dict):
#     result = tasks.insert_one(task_data)
#     return str(result.inserted_id)




from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "ai_collab_team")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
tasks = db["tasks"]

def save_task(task_data: dict):
    result = tasks.insert_one(task_data)
    return str(result.inserted_id)
