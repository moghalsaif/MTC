import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EXACT_EQUIPMENT_DATA = [
    {"name": "Power charger adapter", "quantity": 8, "category": "Power"},
    {"name": "Apple IPAD Pro", "quantity": 1, "category": "Computing"},
    {"name": "Ethernet Cables", "quantity": 7, "category": "Cables"},
    {"name": "Clapper Board", "quantity": 1, "category": "Production Gear"},
    {"name": "Accsoon Digitek Battery", "quantity": 1, "category": "Power"},
    {"name": "Hollyland LARK M2 Wireless Lavalier Microphone", "quantity": 1, "category": "Audio"},
    {"name": "BMD Camera Small Rig 6K Mount", "quantity": 1, "category": "Camera Accessories"},
    {"name": "Keyboard", "quantity": 5, "category": "Peripherals"},
    {"name": "Meta Quest 3 VR Headset and Controllers", "quantity": 1, "category": "VR"},
    {"name": "Sanat SanDisk SSD 500GB", "quantity": 1, "category": "Storage"},
    {"name": "Amaran 300c Light (White)", "quantity": 1, "category": "Lighting"},
    {"name": "Camera Digitek Tripod Stand", "quantity": 1, "category": "Camera Accessories"},
    {"name": "BenQ Monitor 27Inch", "quantity": 2, "category": "Display"},
    {"name": "Godox Honeycomb Grid Softbox", "quantity": 1, "category": "Lighting"},
    {"name": "RTX 4070 Setup", "quantity": 1, "category": "Computing"},
    {"name": "C Stand", "quantity": 1, "category": "Lighting"},
    {"name": "Lightcraft Jetset Vertical Origin", "quantity": 1, "category": "Lighting"},
    {"name": "Camera Calliberation Checkerboard", "quantity": 2, "category": "Camera Accessories"},
    {"name": "PowerBank (10000MAH)", "quantity": 2, "category": "Power"},
    {"name": "Samsung Portable T7 SSD 4TB", "quantity": 2, "category": "Storage"},
    {"name": "Digitek Stick Light", "quantity": 1, "category": "Lighting"},
    {"name": "TP Link Wifi Modem", "quantity": 1, "category": "Networking"},
    {"name": "Asus Pro Art Monitor 24Inch", "quantity": 2, "category": "Display"},
    {"name": "Iphone Cooler", "quantity": 1, "category": "Cooling"},
    {"name": "Small Cooler Fans", "quantity": 2, "category": "Cooling"},
    {"name": "Camera Power Adapter", "quantity": 1, "category": "Power"},
    {"name": "Rack", "quantity": 1, "category": "Storage"},
    {"name": "12G SDI Cables", "quantity": 9, "category": "Cables"},
    {"name": "HDMI To Display Port Converter", "quantity": 1, "category": "Cables"},
    {"name": "Green Gaffe Tape (chargeble if clients need, do not give free)", "quantity": 1, "category": "Production Gear"},
    {"name": "Camera Lens EF (Canon 24-70mm)", "quantity": 1, "category": "Camera"},
    {"name": "Tentacle Sync Track E Pocket Audio Recorder", "quantity": 2, "category": "Audio"},
    {"name": "Samsung Portable T7 SSD 1TB", "quantity": 1, "category": "Storage"},
    {"name": "Apple Iphone 11", "quantity": 1, "category": "Mobile"},
    {"name": "Mobile Stand", "quantity": 1, "category": "Peripherals"},
    {"name": "Lightcraft Jetset Floor Origin", "quantity": 1, "category": "Lighting"},
    {"name": "Apple Iphone 15 Pro", "quantity": 1, "category": "Mobile"},
    {"name": "Accsoon Seemo Pro 4K", "quantity": 1, "category": "Camera Accessories"},
    {"name": "HDMI Cables", "quantity": 8, "category": "Cables"},
    {"name": "Accsoon Simpex Battery", "quantity": 1, "category": "Power"},
    {"name": "Blackmagic SDI Distribution 4K", "quantity": 1, "category": "Video"},
    {"name": "Extension Board", "quantity": 5, "category": "Power"},
    {"name": "Camera Battery Charger", "quantity": 1, "category": "Power"},
    {"name": "Type C Cables", "quantity": 20, "category": "Cables"},
    {"name": "Mouse", "quantity": 4, "category": "Peripherals"},
    {"name": "LG OLED TV", "quantity": 1, "category": "Display"},
    {"name": "Blackmagic Pocket Cinema Camera 6K G2", "quantity": 1, "category": "Camera"},
    {"name": "Blackmagic HDMI To SDI Bi-Directional Converter", "quantity": 1, "category": "Video"},
    {"name": "RTX 4080 Setup", "quantity": 1, "category": "Computing"},
    {"name": "Light Stand", "quantity": 3, "category": "Lighting"},
    {"name": "Ethernet Switch Board", "quantity": 1, "category": "Networking"},
    {"name": "Lacie C to C cables (orange)", "quantity": 3, "category": "Cables"},
    {"name": "Jio Tracker", "quantity": 2, "category": "Tracking"},
    {"name": "Bosch measurement", "quantity": 1, "category": "Tools"},
    {"name": "Blackmagic Decklink CaptureCard 8K Pro G2", "quantity": 1, "category": "Video"},
    {"name": "AJA KI Pro Ultra 12G Media Recorder", "quantity": 1, "category": "Media"},
    {"name": "AJA PAK Dock Pro", "quantity": 1, "category": "Media"},
    {"name": "Blackmagic Ultimatte 12 Power Cable", "quantity": 1, "category": "Power"},
    {"name": "AJA 1TB Drives", "quantity": 2, "category": "Storage"},
    {"name": "Blackmagic Ultimatte 12 4K", "quantity": 1, "category": "Video"},
    {"name": "AJA Power Cable", "quantity": 1, "category": "Power"},
    {"name": "PC Power Cables", "quantity": 4, "category": "Power"},
    {"name": "A6000ADA Setup", "quantity": 1, "category": "Camera"},
    {"name": "display cables", "quantity": 1, "category": "Cables"},
    {"name": "TP link dongle (A6000)", "quantity": 1, "category": "Networking"},
    {"name": "Sony FX3 Small Rig Mount", "quantity": 1, "category": "Camera"},
    {"name": "Alan Keys", "quantity": 10, "category": "Tools"},
    {"name": "Power Bank 20000MAH", "quantity": 1, "category": "Power"},
    {"name": "International power adapters", "quantity": 3, "category": "Power"},
    {"name": "type B cable (Pentab)", "quantity": 1, "category": "Cables"},
    {"name": "PC Cleaner Fan", "quantity": 1, "category": "Cooling"},
    {"name": "smallrig blue mounts", "quantity": 3, "category": "Camera Accessories"},
    {"name": "SDI Distributer Power Cable", "quantity": 1, "category": "Power"},
    {"name": "Treadmill Rasberry PI and Mouse Sensor Box Set", "quantity": 1, "category": "Sensors"},
    {"name": "Treadmill Rasberry PI Power cable", "quantity": 1, "category": "Power"},
    {"name": "Treadmill Mouse sensor Mount", "quantity": 1, "category": "Mounts"},
    {"name": "Treadmill", "quantity": 1, "category": "Fitness"},
    {"name": "Stationary", "quantity": 1, "category": "Production Gear"},
    {"name": "Mach Mouse Pads", "quantity": 3, "category": "Peripherals"},
    {"name": "A6000 Wheel Base", "quantity": 1, "category": "Camera Accessories"},
    {"name": "Green Mats", "quantity": 1, "category": "Production Gear"},
    {"name": "Amaron Power Cable", "quantity": 1, "category": "Power"}
]

async def reseed_exact_equipment():
    print("🔄 Clearing existing items...")
    result = await db.items.delete_many({})
    print(f"✓ Deleted {result.deleted_count} existing items")
    
    items = []
    for equip in EXACT_EQUIPMENT_DATA:
        item = {
            "id": str(uuid.uuid4()),
            "name": equip["name"],
            "category": equip["category"],
            "total_quantity": equip["quantity"],
            "quantity_available": equip["quantity"],
            "quantity_out": 0,
            "location_in_studio": None,
            "status": "Available",
            "condition": "OK",
            "min_stock": 2 if equip["category"] in ["Power", "Cables", "Storage"] else None,
            "notes": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        items.append(item)
    
    await db.items.insert_many(items)
    print(f"✓ Successfully inserted {len(items)} items with EXACT quantities from Excel")
    print("\n=== VERIFICATION ===")
    print("Lacie cables:", [i for i in items if "Lacie" in i["name"]][0]["total_quantity"])
    print("BMD Camera Small Rig 6K Mount:", [i for i in items if "BMD Camera Small Rig 6K Mount" in i["name"]][0]["total_quantity"])
    print("Keyboard:", [i for i in items if i["name"] == "Keyboard"][0]["total_quantity"])
    print("Amaran 300c:", [i for i in items if "Amaran 300c" in i["name"]][0]["total_quantity"])

if __name__ == "__main__":
    asyncio.run(reseed_exact_equipment())
