import os
import csv
import io
import re
from datetime import timedelta
from functools import wraps

from bson import ObjectId
from flask import Flask, jsonify, request
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from models import get_db


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
ALLOWED_UPLOAD_EXTENSIONS = {".json", ".txt", ".pdf", ".docx", ".doc"}
EXPECTED_COLUMNS = [
    "StudentID",
    "StudentName",
    "Subject1",
    "Subject2",
    "Subject3",
    "Subject4",
    "Subject5",
]


app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-this-secret-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=4)


db = get_db()
users_collection = db["users"]
students_collection = db["students"]

os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------- Helpers ----------
def is_valid_email(email: str) -> bool:
    return isinstance(email, str) and "@" in email and "." in email


def safe_object_id(doc):
    if not doc:
        return doc
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc


def role_required(required_role: str):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get("role")
            if user_role != required_role:
                return jsonify({"error": "Forbidden: insufficient role permissions"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def validate_and_normalize_rows(rows):
    if not rows:
        return False, "Uploaded data is empty", []
    if len(rows) > 1000:
        return False, "Upload supports up to 1000 students", []

    normalized_rows = []
    for row in rows:
        keys = set(row.keys())
        if set(EXPECTED_COLUMNS) != keys:
            return False, f"Data fields must be exactly: {', '.join(EXPECTED_COLUMNS)}", []

        student_id = str(row.get("StudentID", "")).strip()
        student_name = str(row.get("StudentName", "")).strip()
        if not student_id or not student_name:
            return False, "StudentID and StudentName cannot be empty", []

        subjects = {}
        for subject_col in ["Subject1", "Subject2", "Subject3", "Subject4", "Subject5"]:
            raw_value = row.get(subject_col)
            try:
                numeric_value = int(float(str(raw_value).strip()))
            except (TypeError, ValueError):
                return False, f"Column '{subject_col}' must contain numeric values only", []

            if numeric_value < 0 or numeric_value > 100:
                return False, f"Column '{subject_col}' must have values between 0 and 100", []
            subjects[subject_col] = numeric_value

        normalized_rows.append(
            {
                "StudentID": student_id,
                "StudentName": student_name,
                **subjects,
            }
        )

    return True, "Data is valid", normalized_rows


def parse_rows_from_text(text_content):
    reader = csv.DictReader(io.StringIO(text_content.strip()))
    rows = []
    for row in reader:
        if not row:
            continue
        cleaned = {str(k).strip(): str(v).strip() for k, v in row.items() if k is not None}
        rows.append(cleaned)
    return rows


def parse_rows_from_uploaded_file(save_path, ext):
    if ext == ".json":
        import json
        with open(save_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        if isinstance(payload, dict) and "students" in payload and isinstance(payload["students"], list):
            return payload["students"]
        if isinstance(payload, list):
            return payload
        raise ValueError("JSON must be either a list of student objects or an object with a 'students' list")

    if ext == ".txt":
        with open(save_path, "r", encoding="utf-8") as f:
            return parse_rows_from_text(f.read())

    if ext == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise ValueError("PDF parsing dependency missing. Install 'pypdf'.") from exc

        reader = PdfReader(save_path)
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
        return parse_rows_from_text(text)

    if ext == ".docx":
        try:
            from docx import Document
        except ImportError as exc:
            raise ValueError("DOCX parsing dependency missing. Install 'python-docx'.") from exc

        document = Document(save_path)
        text = "\n".join(paragraph.text for paragraph in document.paragraphs)
        return parse_rows_from_text(text)

    if ext == ".doc":
        raise ValueError("Legacy .doc is not supported for parsing. Convert file to .docx or .txt.")

    raise ValueError("Unsupported file type")


def process_student_data(rows):
    scored_rows = []
    for row in rows:
        total = row["Subject1"] + row["Subject2"] + row["Subject3"] + row["Subject4"] + row["Subject5"]
        average = round(total / 5, 2)
        scored_rows.append({**row, "total": total, "average": average})

    ranked_rows = sorted(scored_rows, key=lambda x: (-x["total"], -x["average"], x["StudentName"].lower()))
    subject_name_map = {
        "Subject1": "subject1",
        "Subject2": "subject2",
        "Subject3": "subject3",
        "Subject4": "subject4",
        "Subject5": "subject5",
    }

    student_docs = []
    for index, row in enumerate(ranked_rows, start=1):
        best_subject_source = max(
            ["Subject1", "Subject2", "Subject3", "Subject4", "Subject5"],
            key=lambda col: row[col],
        )
        student_docs.append(
            {
                "student_id": row["StudentID"],
                "name": row["StudentName"],
                "subjects": {
                    "subject1": int(row["Subject1"]),
                    "subject2": int(row["Subject2"]),
                    "subject3": int(row["Subject3"]),
                    "subject4": int(row["Subject4"]),
                    "subject5": int(row["Subject5"]),
                },
                "total": int(row["total"]),
                "average": float(row["average"]),
                "rank": index,
                "best_subject": subject_name_map[best_subject_source],
            }
        )
    return student_docs


def compute_admin_dashboard_metrics(student_docs):
    if not student_docs:
        return {
            "top_students": [],
            "top_rankings": [],
            "subject_averages": {},
            "best_subject_distribution": {},
            "class_performance": {"labels": [], "totals": [], "averages": []},
            "summary": {"total_students": 0, "class_average": 0},
        }

    sorted_by_rank = sorted(student_docs, key=lambda x: x["rank"])
    top_5 = sorted_by_rank[:5]

    subject_keys = ["subject1", "subject2", "subject3", "subject4", "subject5"]

    subject_averages = {}
    for key in subject_keys:
        subject_averages[key] = round(sum(doc["subjects"][key] for doc in student_docs) / len(student_docs), 2)

    best_subject_distribution = {}
    for doc in student_docs:
        best_subject = doc["best_subject"]
        best_subject_distribution[best_subject] = best_subject_distribution.get(best_subject, 0) + 1

    class_average = round(sum(doc["average"] for doc in student_docs) / len(student_docs), 2)

    class_performance_labels = [doc["name"] for doc in sorted_by_rank]
    class_performance_totals = [doc["total"] for doc in sorted_by_rank]
    class_performance_averages = [doc["average"] for doc in sorted_by_rank]

    return {
        "top_students": [{"name": s["name"], "total": s["total"], "rank": s["rank"]} for s in top_5],
        "top_rankings": [{"rank": s["rank"], "name": s["name"], "average": s["average"]} for s in top_5],
        "subject_averages": subject_averages,
        "best_subject_distribution": best_subject_distribution,
        "class_performance": {
            "labels": class_performance_labels,
            "totals": class_performance_totals,
            "averages": class_performance_averages,
        },
        "summary": {"total_students": len(student_docs), "class_average": class_average},
    }


def build_student_search_response(student_doc, email=None, student_docs=None):
    student_docs = student_docs or []
    class_metrics = compute_admin_dashboard_metrics(student_docs)

    return {
        "student": {
            "student_id": student_doc["student_id"],
            "name": student_doc["name"],
            "email": email or "Not linked",
            "subjects": student_doc["subjects"],
            "total": student_doc["total"],
            "average": student_doc["average"],
            "rank": student_doc["rank"],
            "best_subject": student_doc["best_subject"],
        },
        "class": {
            "total_students": class_metrics["summary"]["total_students"],
            "class_average": class_metrics["summary"]["class_average"],
            "subject_averages": class_metrics["subject_averages"],
        },
        "comparison": {
            "student_average": student_doc["average"],
            "class_average": class_metrics["summary"]["class_average"],
        },
    }


# ---------- Health ----------
@app.route("/", methods=["GET"])
def health():
    return jsonify({"message": "Smart Student Data Visualization Portal backend is running"})


# ---------- Auth ----------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    role = str(data.get("role", "")).strip().lower()

    if not all([name, email, password, role]):
        return jsonify({"error": "All fields are required: name, email, password, role"}), 400

    if role not in {"admin", "student"}:
        return jsonify({"error": "Role must be either 'admin' or 'student'"}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return jsonify({"error": "Email already registered"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    users_collection.insert_one(
        {
            "name": name,
            "email": email,
            "password": hashed_password,
            "role": role,
        }
    )

    return jsonify({"message": "Registration successful"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Keep JWT subject as string for compatibility with strict JWT validation.
    token = create_access_token(
        identity=user["email"],
        additional_claims={"role": user["role"], "name": user["name"]},
    )

    return (
        jsonify(
            {
                "message": "Login successful",
                "token": token,
                "user": {
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                },
            }
        ),
        200,
    )


# ---------- Admin ----------
@app.route("/upload_data", methods=["POST"])
@role_required("admin")
def upload_data():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use form-data key 'file'"}), 400

    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    _, ext = os.path.splitext(uploaded_file.filename.lower())
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return jsonify({"error": "Only .json, .txt, .pdf, .docx, .doc files are allowed"}), 400

    save_path = os.path.join(UPLOAD_DIR, uploaded_file.filename)
    uploaded_file.save(save_path)

    try:
        parsed_rows = parse_rows_from_uploaded_file(save_path, ext)
    except Exception as exc:
        return jsonify({"error": f"Invalid uploaded file: {str(exc)}"}), 400

    is_valid, message, normalized_rows = validate_and_normalize_rows(parsed_rows)
    if not is_valid:
        return jsonify({"error": message}), 400

    student_docs = process_student_data(normalized_rows)

    # Replace old snapshot data with the latest uploaded class data.
    students_collection.delete_many({})
    students_collection.insert_many(student_docs)

    dashboard_data = compute_admin_dashboard_metrics(student_docs)

    return (
        jsonify(
            {
                "message": "File uploaded and processed successfully",
                "students_processed": len(student_docs),
                "dashboard_preview": dashboard_data,
            }
        ),
        200,
    )


@app.route("/admin/dashboard", methods=["GET"])
@role_required("admin")
def admin_dashboard():
    student_docs = list(students_collection.find({}, {"_id": 0}))
    data = compute_admin_dashboard_metrics(student_docs)
    return jsonify(data), 200


@app.route("/admin/student-search", methods=["GET"])
@role_required("admin")
def admin_student_search():
    query = str(request.args.get("q", "")).strip()
    if not query:
        return jsonify({"error": "Search query is required"}), 400

    student_docs = list(students_collection.find({}, {"_id": 0}))
    if not student_docs:
        return jsonify({"error": "No uploaded student data found"}), 404

    lowered_query = query.lower()
    email_pattern = re.compile(re.escape(query), re.IGNORECASE)
    name_pattern = re.compile(re.escape(query), re.IGNORECASE)

    matched_user = users_collection.find_one(
        {
            "role": "student",
            "$or": [
                {"email": lowered_query},
                {"email": email_pattern},
                {"name": name_pattern},
            ],
        },
        {"_id": 0, "name": 1, "email": 1},
    )

    student_doc = None
    linked_email = None

    if matched_user:
        linked_email = matched_user.get("email")
        exact_name_pattern = re.compile(f"^{re.escape(matched_user['name'].strip())}$", re.IGNORECASE)
        student_doc = students_collection.find_one({"name": exact_name_pattern}, {"_id": 0})

    if not student_doc:
        exact_student_name_pattern = re.compile(f"^{re.escape(query)}$", re.IGNORECASE)
        student_doc = students_collection.find_one({"name": exact_student_name_pattern}, {"_id": 0})

    if not student_doc:
        student_doc = students_collection.find_one({"name": name_pattern}, {"_id": 0})

    if not student_doc:
        return jsonify({"error": "No student found for the provided name or email"}), 404

    if not linked_email:
        linked_user = users_collection.find_one(
            {
                "role": "student",
                "name": re.compile(f"^{re.escape(student_doc['name'])}$", re.IGNORECASE),
            },
            {"_id": 0, "email": 1},
        )
        linked_email = linked_user.get("email") if linked_user else None

    return jsonify(build_student_search_response(student_doc, linked_email, student_docs)), 200


# ---------- Student ----------
@app.route("/student/dashboard", methods=["GET"])
@role_required("student")
def student_dashboard():
    identity = get_jwt_identity()
    email = str(identity or "").strip().lower()

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Match by student name case-insensitively to avoid login/data case mismatch.
    student_name_pattern = re.compile(f"^{re.escape(user['name'].strip())}$", re.IGNORECASE)
    student_doc = students_collection.find_one({"name": student_name_pattern}, {"_id": 0})
    if not student_doc:
        return (
            jsonify(
                {
                    "error": "No uploaded student record found for this user. Ensure StudentName matches the registered student name."
                }
            ),
            404,
        )

    student_docs = list(students_collection.find({}, {"_id": 0}))
    response = build_student_search_response(student_doc, user.get("email"), student_docs)
    return jsonify(response), 200


# ---------- JWT Error Handlers ----------
@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({"error": "Missing or invalid Authorization header", "details": error}), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({"error": "Invalid token", "details": error}), 422


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({"error": "Token has expired"}), 401


if __name__ == "__main__":
    app.run(debug=True)
