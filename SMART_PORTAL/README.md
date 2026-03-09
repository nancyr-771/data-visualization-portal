# Smart Student Data Visualization Portal

Full-stack application with JWT authentication, role-based dashboards, document upload processing, MongoDB storage, and Chart.js visualizations.

## Highlight Feature
- Admin student performance search: admins can search by student name or registered email ID and view the selected student's subject-wise marks, overall average, rank, total, and class comparison directly in the dashboard.

## Tech Stack
- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Python Flask
- Database: MongoDB
- Auth: JWT (`flask_jwt_extended`)
- File Parsing: JSON/TXT/PDF/DOCX

## Project Structure
```text
SMART_PORTAL/
|-- backend/
|   |-- app.py
|   |-- models.py
|   `-- requirements.txt
|-- frontend/
|   |-- register.html
|   |-- login.html
|   |-- admin_dashboard.html
|   |-- student_dashboard.html
|   |-- css/
|   |   `-- styles.css
|   `-- js/
|       |-- common.js
|       |-- auth.js
|       |-- admin.js
|       `-- student.js
|-- uploads/
|   `-- (your uploaded data files)
`-- README.md
```

## Setup Instructions

1. Create and activate virtual environment
```bash
cd SMART_PORTAL/backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Start MongoDB
- Local default expected at `mongodb://localhost:27017/`
- Optional environment variables:
  - `MONGO_URI`
  - `MONGO_DB_NAME`

4. Configure JWT secret (recommended)
```bash
# Windows PowerShell
$env:JWT_SECRET_KEY="your-strong-secret"
```

5. Run backend
```bash
python app.py
```
Backend runs at `http://127.0.0.1:5000`.

6. Open frontend pages
- Open files from `SMART_PORTAL/frontend/` in browser:
  - `register.html`
  - `login.html`

## API Endpoints

### Authentication
- `POST /register`
- `POST /login`

### Admin (JWT role = admin)
- `POST /upload_data` (form-data key: `file`)
- `GET /admin/dashboard`
- `GET /admin/student-search?q=<name-or-email>`

### Student (JWT role = student)
- `GET /student/dashboard`

## Upload Format
Supported upload extensions:
- `.json`
- `.txt`
- `.pdf` (text-based table content)
- `.docx` (text-based table content)
- `.doc` (upload accepted but parsing unsupported; convert to `.docx` or `.txt`)

All parsed data must contain exactly these fields:

```csv
StudentID,StudentName,Subject1,Subject2,Subject3,Subject4,Subject5
```

For `.txt`, `.pdf`, and `.docx`, include rows in the same comma-separated structure.

JSON can be:

```json
[
  {
    "StudentID": "S001",
    "StudentName": "Nancy",
    "Subject1": 85,
    "Subject2": 78,
    "Subject3": 92,
    "Subject4": 88,
    "Subject5": 80
  }
]
```

or:

```json
{ "students": [ ... ] }
```

## Notes
- Passwords are hashed with bcrypt.
- JWT token includes user role and identity.
- Student dashboard maps user to student record by exact `StudentName` = registered `name`.
- Max supported upload size: 1000 students.
