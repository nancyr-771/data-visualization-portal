# Smart Student Data Visualization Portal

Production-style student analytics portal built with Flask, MongoDB, JWT auth, HTML/CSS/JavaScript, and Chart.js.

## What Changed
- Multi-class upload history. Each upload is stored as a separate class snapshot.
- Dynamic subject support. Subjects are detected from uploaded columns instead of being fixed.
- Modern admin dashboard with sidebar, class selector, reports, insights, search, and richer charts.
- Student management page with search, sort, and filter.
- Enhanced student dashboard with grades, pass/fail status, progress bars, and class comparison.
- Export APIs for PDF and Excel.

## Tech Stack
- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Python Flask
- Database: MongoDB
- Auth: JWT (`flask_jwt_extended`)
- File Parsing: JSON, TXT, PDF, DOCX
- Export: `reportlab`, `openpyxl`

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
|   |-- students.html
|   |-- css/
|   |   `-- styles.css
|   `-- js/
|       |-- common.js
|       |-- auth.js
|       |-- admin.js
|       `-- student.js
|-- uploads/
`-- README.md
```

## Setup
```powershell
cd "c:\Users\EBIN\Downloads\data visualization portal\SMART_PORTAL\backend"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:JWT_SECRET_KEY="your-strong-secret"
python app.py
```

MongoDB should be running locally at `mongodb://localhost:27017/` unless you override:
- `MONGO_URI`
- `MONGO_DB_NAME`

Then open:
- `SMART_PORTAL/frontend/login.html`
- `SMART_PORTAL/frontend/register.html`

## Core APIs

### Auth
- `POST /register`
- `POST /login`

### Admin
- `POST /upload_data`
- `GET /admin/classes`
- `GET /admin/dashboard?class_id=`
- `GET /admin/student-search?q=<name-or-email>&class_id=`
- `GET /admin/students?class_id=&search=&sort=&filter=`
- `GET /admin/export/pdf?class_id=`
- `GET /admin/export/excel?class_id=`

### Student
- `GET /student/dashboard?class_id=`

## Upload Format
Required columns:
- `StudentID`
- `StudentName`
- One or more subject columns

Example CSV:

```csv
StudentID,StudentName,Math,Science,English,History
S001,Nancy,85,78,92,88
S002,Arun,74,81,69,90
```

Example JSON:

```json
[
  {
    "StudentID": "S001",
    "StudentName": "Nancy",
    "Math": 85,
    "Science": 78,
    "English": 92
  }
]
```

Supported file types:
- `.json`
- `.txt`
- `.pdf`
- `.docx`
- `.doc` upload is accepted but parsing is not supported

## Analytics Included
- Total, average, rank, best subject
- Pass/fail counts
- Grade distribution
- Topper, best subject, weakest subject
- Students below class average
- Student vs class comparison

## Notes
- Passwords are hashed with bcrypt.
- All admin and student analytics APIs are JWT protected.
- Student records are still matched to registered users by student name.
- Max supported upload size is 1000 students per file.
