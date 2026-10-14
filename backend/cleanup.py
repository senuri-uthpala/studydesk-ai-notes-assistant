from app.database import SessionLocal
from app import models

db = SessionLocal()

# Filename එක අනුව group කරලා, පලවෙනි එක විතරක් තියාගෙන අනිත් ඒවා delete කරනවා
seen_filenames = set()
documents = db.query(models.Document).order_by(models.Document.id).all()

deleted_count = 0
for doc in documents:
    if doc.filename in seen_filenames:
        db.delete(doc)
        deleted_count += 1
    else:
        seen_filenames.add(doc.filename)

db.commit()
db.close()

print(f"Deleted {deleted_count} duplicate documents.")