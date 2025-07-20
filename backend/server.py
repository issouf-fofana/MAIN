from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
import uuid
import qrcode
import io
import base64

app = FastAPI(title="E-commerce API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.ecommerce

# Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: str
    stock: int = 10

class CartItem(BaseModel):
    product_id: str
    quantity: int
    product_name: str
    product_price: float
    product_image: str

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[CartItem]
    total: float
    customer_name: str
    customer_email: str
    customer_phone: str
    status: str = "pending"
    payment_method: str = "qr_code"
    created_at: datetime = Field(default_factory=datetime.now)
    qr_code_data: Optional[str] = None

# Sample products data
sample_products = [
    {
        "id": "1",
        "name": "Smartphone Samsung Galaxy",
        "description": "Smartphone haut de gamme avec appareil photo 108MP",
        "price": 899.99,
        "category": "smartphones",
        "image_url": "https://images.unsplash.com/photo-1583573636246-18cb2246697f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lc3xlbnwwfHx8Ymx1ZXwxNzUzMDMwMTMwfDA&ixlib=rb-4.1.0&q=85",
        "stock": 15
    },
    {
        "id": "2",
        "name": "iPhone 15 Pro",
        "description": "Dernier iPhone avec puce A17 Pro et caméra avancée",
        "price": 1199.99,
        "category": "smartphones",
        "image_url": "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwyfHxzbWFydHBob25lc3xlbnwwfHx8Ymx1ZXwxNzUzMDMwMTMwfDA&ixlib=rb-4.1.0&q=85",
        "stock": 10
    },
    {
        "id": "3",
        "name": "MacBook Pro M3",
        "description": "Ordinateur portable professionnel avec puce M3",
        "price": 2499.99,
        "category": "laptops",
        "image_url": "https://images.unsplash.com/photo-1586077427825-15dca6b44dba?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxsYXB0b3BzfGVufDB8fHxibHVlfDE3NTMwMzAxMzd8MA&ixlib=rb-4.1.0&q=85",
        "stock": 8
    },
    {
        "id": "4",
        "name": "HP Envy Laptop",
        "description": "Laptop élégant pour usage professionnel et personnel",
        "price": 899.99,
        "category": "laptops",
        "image_url": "https://images.unsplash.com/photo-1579362243176-b746a02bc030?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwzfHxsYXB0b3BzfGVufDB8fHx8Ymx1ZXwxNzUzMDMwMTMwfDA&ixlib=rb-4.1.0&q=85",
        "stock": 12
    },
    {
        "id": "5",
        "name": "Casque Sony WH-1000XM4",
        "description": "Casque sans fil avec réduction de bruit active",
        "price": 299.99,
        "category": "audio",
        "image_url": "https://images.unsplash.com/photo-1614860243518-c12eb2fdf66c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzUyOTEyNTA1fDA&ixlib=rb-4.1.0&q=85",
        "stock": 20
    },
    {
        "id": "6",
        "name": "Kit Développement Arduino",
        "description": "Kit complet pour apprendre l'électronique et la programmation",
        "price": 89.99,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzUyOTEyNTA1fDA&ixlib=rb-4.1.0&q=85",
        "stock": 25
    }
]

def generate_qr_code(phone_number: str, amount: float, order_id: str) -> str:
    """Generate QR code for mobile payment"""
    # QR code data with payment information
    qr_data = f"TEL:{phone_number}\nMONTANT:{amount}€\nCOMMANDE:{order_id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    # Create QR code image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 for frontend display
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

@app.on_event("startup")
async def startup_event():
    """Initialize database with sample products"""
    try:
        # Check if products already exist
        existing_products = await db.products.count_documents({})
        if existing_products == 0:
            await db.products.insert_many(sample_products)
            print("Sample products inserted into database")
    except Exception as e:
        print(f"Error initializing database: {e}")

@app.get("/api/products", response_model=List[Product])
async def get_products():
    """Get all products"""
    try:
        products = await db.products.find({}, {"_id": 0}).to_list(100)
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get single product"""
    try:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/category/{category}")
async def get_products_by_category(category: str):
    """Get products by category"""
    try:
        products = await db.products.find({"category": category}, {"_id": 0}).to_list(100)
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class OrderCreate(BaseModel):
    items: List[CartItem]
    customer_name: str
    customer_email: str
    customer_phone: str

@app.post("/api/orders", response_model=dict)
async def create_order(order_data: OrderCreate):
    """Create new order and generate QR code"""
    try:
        # Calculate total
        total = sum(item.product_price * item.quantity for item in order_data.items)
        
        # Create order
        order = Order(
            items=order_data.items,
            total=total,
            customer_name=order_data.customer_name,
            customer_email=order_data.customer_email,
            customer_phone=order_data.customer_phone
        )
        
        # Generate QR code with phone number 0759177681
        qr_code_image = generate_qr_code("0759177681", total, order.id)
        order.qr_code_data = qr_code_image
        
        # Save to database
        order_dict = order.dict()
        order_dict["created_at"] = order_dict["created_at"].isoformat()
        await db.orders.insert_one(order_dict)
        
        return {
            "order_id": order.id,
            "total": total,
            "qr_code": qr_code_image,
            "payment_phone": "0759177681",
            "status": "pending"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Get order details"""
    try:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...)):
    """Update order status (admin function)"""
    try:
        result = await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": status}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Order status updated", "status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "E-commerce API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)