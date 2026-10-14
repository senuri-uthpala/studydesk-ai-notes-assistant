from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pdf, chat
from app.database import engine
from app import models
from app.routers import pdf, chat, auth

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Student Assistant")

# CORS - frontend (වෙනම origin එකකින්) backend එකට call කරන්න allow කරනවා
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf.router)
app.include_router(chat.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "AI Student Assistant API is running!"}