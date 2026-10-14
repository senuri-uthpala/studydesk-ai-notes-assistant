from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
import os
from app.services.pdf_extractor import extract_text_from_pdf
from app.database import get_db
from app import models
from app.services.auth_service import get_current_user_id

router = APIRouter(prefix="/pdf", tags=["PDF"])

UPLOAD_DIR = "uploads"


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    subject: str = Form("General"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    # 1. PDF file එකක්ද කියලා check කරනවා
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="PDF file එකක් විතරයි upload කරන්න පුළුවන්"
        )

    # 2. Upload folder එක නැත්නම් හදනවා
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # 3. File එක save කරනවා
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # 4. Text extract කරනවා
    try:
        extracted_text = extract_text_from_pdf(file_path)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF text extract කරන කොට error එකක්: {str(e)}"
        )

    # 5. Database එකට save කරනවා (subject එකත්, user_id එකත් සමග)
    new_document = models.Document(
        filename=file.filename,
        subject=subject if subject else "General",
        content=extracted_text,
        user_id=user_id
    )
    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    return {
        "id": new_document.id,
        "filename": new_document.filename,
        "subject": new_document.subject,
        "message": "PDF uploaded and saved to database!",
        "text_preview": extracted_text[:300]
    }


@router.get("/documents")
def list_documents(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """
    Login වුනු user කෙනෙක්ගේ documents විතරක් list එකක් විදිහට return කරනවා
    """
    documents = db.query(models.Document).filter(
        models.Document.user_id == user_id
    ).order_by(models.Document.id.desc()).all()
    return [
        {"id": doc.id, "filename": doc.filename, "subject": doc.subject}
        for doc in documents
    ]


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.user_id == user_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document එක හම්බුනේ නෑ")

    db.delete(document)
    db.commit()

    return {"message": "Document එක delete කරලා ඉවරයි", "id": document_id}