from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app import models
from app.services.llm_service import get_ai_answer, generate_quiz, generate_flashcards


router = APIRouter(prefix="/chat", tags=["Chat"])


class QuestionRequest(BaseModel):
    document_id: int
    question: str


@router.post("/ask")
def ask_question(request: QuestionRequest, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(
        models.Document.id == request.document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document එක හම්බුනේ නෑ")

    answer = get_ai_answer(context=document.content, question=request.question)

    history_entry = models.ChatHistory(
        document_id=request.document_id,
        question=request.question,
        answer=answer
    )
    db.add(history_entry)
    db.commit()

    return {
        "document": document.filename,
        "question": request.question,
        "answer": answer
    }


@router.get("/history/{document_id}")
def get_chat_history(document_id: int, db: Session = Depends(get_db)):
    history = db.query(models.ChatHistory).filter(
        models.ChatHistory.document_id == document_id
    ).order_by(models.ChatHistory.id).all()

    return [
        {"question": h.question, "answer": h.answer}
        for h in history
    ]


@router.post("/quiz/{document_id}")
def create_quiz(document_id: int, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(
        models.Document.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document එක හම්බුනේ නෑ")

    quiz = generate_quiz(document.content)

    if isinstance(quiz, dict) and "error" in quiz:
        raise HTTPException(status_code=500, detail=quiz["error"])

    return {"document": document.filename, "quiz": quiz}


@router.post("/flashcards/{document_id}")
def create_flashcards(document_id: int, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(
        models.Document.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document එක හම්බුනේ නෑ")

    flashcards = generate_flashcards(document.content)

    if isinstance(flashcards, dict) and "error" in flashcards:
        raise HTTPException(status_code=500, detail=flashcards["error"])

    return {"document": document.filename, "flashcards": flashcards}