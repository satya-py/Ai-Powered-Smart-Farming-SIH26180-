"""Initialize database schema and seed demo data."""

import logging
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import Farm, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Seed default Farm and Field if none exist
    if db.query(Farm).count() == 0:
        logger.info("Seeding default Farm and Field...")
        demo_farm = Farm(name="Demo Farm", location="Smart Farm HQ")
        db.add(demo_farm)
        db.commit()
        db.refresh(demo_farm)
        
        demo_field = Field(farm_id=demo_farm.id, name="Field A", crop="Tomato")
        db.add(demo_field)
        db.commit()
        
    # Seed default Fertilizers
    from backend.database.models import Fertilizer
    if db.query(Fertilizer).count() == 0:
        logger.info("Seeding default Fertilizer catalog...")
        fertilizers = [
            Fertilizer(name="Urea", category="Nitrogen-based", n_percent=46.0, p_percent=0.0, k_percent=0.0, notes="High nitrogen source."),
            Fertilizer(name="DAP (Di-Ammonium Phosphate)", category="Phosphorus-based", n_percent=18.0, p_percent=46.0, k_percent=0.0, notes="Good for root development."),
            Fertilizer(name="MOP (Muriate of Potash)", category="Potassium-based", n_percent=0.0, p_percent=0.0, k_percent=60.0, notes="High potassium source."),
            Fertilizer(name="NPK 10-26-26", category="Complex NPK", n_percent=10.0, p_percent=26.0, k_percent=26.0, notes="Balanced P and K."),
            Fertilizer(name="NPK 20-20-20", category="Complex NPK", n_percent=20.0, p_percent=20.0, k_percent=20.0, notes="Evenly balanced NPK."),
            Fertilizer(name="SSP (Single Super Phosphate)", category="Phosphorus-based", n_percent=0.0, p_percent=16.0, k_percent=0.0, notes="Contains sulfur and calcium as well.")
        ]
        db.add_all(fertilizers)
        db.commit()
        
    db.close()
    logger.info("Database initialization complete.")

if __name__ == "__main__":
    init_db()
