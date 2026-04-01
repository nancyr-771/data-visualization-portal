import os

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError


load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", ".env"))


def get_db():
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME", "studentDB")

    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set. Add it to the root .env file or environment variables.")

    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print(f"[db] Connected to MongoDB Atlas database '{db_name}'")
        return client[db_name]
    except PyMongoError as exc:
        print(f"[db] MongoDB Atlas connection failed: {exc}")
        raise RuntimeError("Failed to connect to MongoDB Atlas. Check your .env configuration and network access.") from exc
