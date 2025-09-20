\# Radio 1 RPH Training Management System



This project has a \*\*React frontend\*\*, a \*\*Flask backend\*\*, and a \*\*MySQL database\*\*.



---



\## Setup Instructions



\### 1. Clone the repo

```bash

git clone https://github.com/Carma123/radio1rph.git

cd radio1rph

```



\### 2. Backend (Flask)

```bash

cd radio1rph\_backend

python -m venv venv

\# On Windows

venv\\Scripts\\activate

\# On Mac/Linux

source venv/bin/activate



pip install -r requirements.txt

flask run

```



\### 3. Frontend (React)

```bash

cd ../radio1rph\_frontend

npm install

npm start

```

\- Opens on: \[http://localhost:3000](http://localhost:3000)



\### 4. MySQL Database

\- Open MySQL Workbench

\- Create a database (e.g., `radio1rph\_db`)

\- Import your schema and data

\- Update database credentials in `radio1rph\_backend/app.py`



---



\## Notes

\- Make sure your backend is running \*\*before\*\* starting the frontend.

\- Your teammate can now edit files locally and see changes in the app.



