import asyncio
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
from pgstore import PgStore

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DATABASE_URL = os.environ.get('DATABASE_URL', '')
TABLES = ["items"]
store = PgStore(DATABASE_URL, TABLES)

EQUIPMENT_DATA = [
    {"name": "Power charger adapter", "category": "Power", "quantity": 8},
    {"name": "Apple IPAD Pro", "category": "Computing", "quantity": 1},
    {"name": "Ethernet Cables", "category": "Cables", "quantity": 7},
    {"name": "Clapper Board", "category": "Production Gear", "quantity": 1},
    {"name": "Accsoon Digitek Battery", "category": "Power", "quantity": 1},
    {"name": "Hollyland LARK M2 Wireless Lavalier Microphone", "category": "Audio", "quantity": 1},
    {"name": "BMD Camera Small Rig 6K Mount", "category": "Camera Accessories", "quantity": 5},
    {"name": "Keyboard", "category": "Peripherals", "quantity": 1},
    {"name": "Meta Quest 3 VR Headset and Controllers", "category": "VR", "quantity": 1},
    {"name": "Sanat SanDisk SSD 500GB", "category": "Storage", "quantity": 1},
    {"name": "Amaran 300c Light (White)", "category": "Lighting", "quantity": 2},
    {"name": "Camera Digitek Tripod Stand", "category": "Camera Accessories", "quantity": 1},
    {"name": "BenQ Monitor 27Inch", "category": "Display", "quantity": 1},
    {"name": "Godox Honeycomb Grid Softbox", "category": "Lighting", "quantity": 1},
    {"name": "RTX 4070 Setup", "category": "Computing", "quantity": 2},
    {"name": "C Stand", "category": "Lighting", "quantity": 2},
    {"name": "Lightcraft Jetset Vertical Origin", "category": "Lighting", "quantity": 2},
    {"name": "Camera Calliberation Checkerboard", "category": "Camera Accessories", "quantity": 1},
    {"name": "PowerBank (10000MAH)", "category": "Power", "quantity": 1},
    {"name": "Samsung Portable T7 SSD 4TB", "category": "Storage", "quantity": 2},
    {"name": "Digitek Stick Light", "category": "Lighting", "quantity": 1},
    {"name": "TP Link Wifi Modem", "category": "Networking", "quantity": 2},
    {"name": "Asus Pro Art Monitor 24Inch", "category": "Display", "quantity": 1},
    {"name": "Iphone Cooler", "category": "Cooling", "quantity": 1},
    {"name": "Small Cooler Fans", "category": "Cooling", "quantity": 9},
    {"name": "Camera Power Adapter", "category": "Power", "quantity": 1},
    {"name": "Rack 12G SDI Cables", "category": "Cables", "quantity": 1},
    {"name": "HDMI To Display Port Converter", "category": "Cables", "quantity": 1},
    {"name": "Green Gaffe Tape", "category": "Production Gear", "quantity": 1},
    {"name": "Camera Lens EF (Canon 24-70mm)", "category": "Camera", "quantity": 1},
    {"name": "Tentacle Sync Track E Pocket Audio Recorder", "category": "Audio", "quantity": 1},
    {"name": "Samsung Portable T7 SSD 1TB", "category": "Storage", "quantity": 8},
    {"name": "Apple Iphone 11", "category": "Mobile", "quantity": 1},
    {"name": "Mobile Stand", "category": "Peripherals", "quantity": 1},
    {"name": "Lightcraft Jetset Floor Origin", "category": "Lighting", "quantity": 5},
    {"name": "Apple Iphone 15 Pro", "category": "Mobile", "quantity": 1},
    {"name": "Accsoon Seemo Pro 4K", "category": "Camera Accessories", "quantity": 20},
    {"name": "HDMI Cables", "category": "Cables", "quantity": 4},
    {"name": "Accsoon Simpex Battery", "category": "Power", "quantity": 1},
    {"name": "Blackmagic SDI Distribution 4K", "category": "Video", "quantity": 1},
    {"name": "Extension Board", "category": "Power", "quantity": 1},
    {"name": "Camera Battery Charger", "category": "Power", "quantity": 1},
    {"name": "Type C Cables", "category": "Cables", "quantity": 3},
    {"name": "Mouse", "category": "Peripherals", "quantity": 1},
    {"name": "LG OLED TV", "category": "Display", "quantity": 3},
    {"name": "Blackmagic Pocket Cinema Camera 6K G2", "category": "Camera", "quantity": 2},
    {"name": "Blackmagic HDMI To SDI Bi-Directional Converter", "category": "Video", "quantity": 1},
    {"name": "RTX 4080 Setup", "category": "Computing", "quantity": 1},
    {"name": "Light Stand", "category": "Lighting", "quantity": 1},
    {"name": "Ethernet Switch Board", "category": "Networking", "quantity": 1},
    {"name": "Lacie C to C cables (orange)", "category": "Cables", "quantity": 2},
    {"name": "Jio Tracker", "category": "Tracking", "quantity": 1},
    {"name": "Bosch measurement", "category": "Tools", "quantity": 1},
    {"name": "Blackmagic Decklink CaptureCard 8K Pro G2", "category": "Video", "quantity": 4},
    {"name": "AJA KI Pro Ultra 12G Media Recorder", "category": "Media", "quantity": 1},
    {"name": "AJA PAK Dock Pro", "category": "Media", "quantity": 66},
    {"name": "Blackmagic Ultimatte 12 Power Cable", "category": "Power", "quantity": 1},
    {"name": "AJA 1TB Drives", "category": "Storage", "quantity": 1},
    {"name": "Blackmagic Ultimatte 12 4K", "category": "Video", "quantity": 10},
    {"name": "AJA Power Cable", "category": "Power", "quantity": 1},
    {"name": "PC Power Cables", "category": "Power", "quantity": 3},
    {"name": "A6000ADA Setup", "category": "Camera", "quantity": 1},
    {"name": "Display cables", "category": "Cables", "quantity": 1},
    {"name": "TP link dongle (A6000)", "category": "Networking", "quantity": 3},
    {"name": "Sony FX3", "category": "Camera", "quantity": 1},
    {"name": "Small Rig Mount", "category": "Camera Accessories", "quantity": 1},
    {"name": "Alan Keys", "category": "Tools", "quantity": 3},
    {"name": "Power Bank 20000MAH", "category": "Power", "quantity": 1},
    {"name": "International power adapters", "category": "Power", "quantity": 1},
    {"name": "Type B cable (Pentab)", "category": "Cables", "quantity": 1},
    {"name": "PC Cleaner Fan", "category": "Cooling", "quantity": 1},
    {"name": "Smallrig blue mounts", "category": "Camera Accessories", "quantity": 1},
    {"name": "SDI Distributer", "category": "Video", "quantity": 1},
    {"name": "Power Cable", "category": "Power", "quantity": 3},
    {"name": "Treadmill", "category": "Fitness", "quantity": 1},
    {"name": "Rasberry PI and Mouse", "category": "Computing", "quantity": 83},
    {"name": "Sensor Box Set", "category": "Sensors", "quantity": 1},
    {"name": "Treadmill Rasberry PI Power cable", "category": "Power", "quantity": 1},
    {"name": "Treadmill Mouse sensor Mount", "category": "Mounts", "quantity": 1},
    {"name": "Mouse Pads", "category": "Peripherals", "quantity": 1},
    {"name": "A6000 Wheel Base", "category": "Camera Accessories", "quantity": 1},
    {"name": "Green Mats", "category": "Production Gear", "quantity": 1},
    {"name": "Amaron Power Cable", "category": "Power", "quantity": 1},
]


async def seed_equipment():
    await store.connect()
    try:
        existing_count = await store.items.count_documents({})
        if existing_count > 0:
            print(f"Database already has {existing_count} items. Skipping seed.")
            return

        count = 0
        for equip in EQUIPMENT_DATA:
            item = {
                "id": str(uuid.uuid4()),
                "name": equip["name"],
                "category": equip["category"],
                "sub_category": None,
                "total_quantity": equip["quantity"],
                "quantity_available": equip["quantity"],
                "quantity_out": 0,
                "location": None,
                "status": "Available",
                "condition": "OK",
                "min_stock": 2 if equip["category"] in ["Power", "Cables", "Storage"] else None,
                "notes": None,
                "product_id": None,
                "serial_number": None,
                "purchase_date": None,
                "expiry_date": None,
                "warranty_expiry": None,
                "vendor": None,
                "purchase_price": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await store.items.insert_one(item)
            count += 1

        print(f"Successfully seeded {count} items into the database.")
    finally:
        await store.close()


if __name__ == "__main__":
    asyncio.run(seed_equipment())
