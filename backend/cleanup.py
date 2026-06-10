from app.database import SessionLocal
from app.models import Segment, Campaign, Communication

db = SessionLocal()
db.query(Communication).delete()
db.query(Campaign).delete()
db.commit()
db.close()
print("Cleared all campaigns and communications.")
