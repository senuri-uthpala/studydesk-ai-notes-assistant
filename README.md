# StudyDesk – AI Notes Assistant

A study assistant where students upload PDF lecture notes, ask questions that are answered from the note content, and generate quizzes and flashcards.

## Features

- PDF upload with subject grouping and note search
- Ask questions about a note (chat history is saved)
- Quiz and flashcard generation
- Study planner, notifications and dark mode
- User registration and token-based (JWT) login

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy
- **Frontend:** HTML5, CSS3, JavaScript
- **AI:** Google Gemini API

## Project Structure

```
backend/    FastAPI app (routers, services, models)
frontend/   index.html, script.js, style.css
```

## Setup

1. `cd backend`
2. Create and activate a virtual environment, then install dependencies:
   `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY` and `JWT_SECRET_KEY`
4. Start the backend: `uvicorn app.main:app --reload`
   (it runs at `http://127.0.0.1:8000`, which the frontend expects)
5. Open `frontend/index.html` in your browser, register an account and upload a PDF

## Author

Senuri Uthpala – [GitHub](https://github.com/senuri-uthpala)
