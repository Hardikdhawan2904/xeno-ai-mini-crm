"""
Run: python seed.py
Seeds 300 customers + 750 orders with realistic Indian retail data.
"""
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal, engine, Base
from app.models import Customer, Order

Base.metadata.create_all(bind=engine)

FIRST_NAMES = [
    "Aarav", "Aditya", "Akash", "Arjun", "Arnav", "Aryan", "Chirag", "Deepak",
    "Dev", "Dhruv", "Harsh", "Ishaan", "Jay", "Karan", "Krishna", "Kunal",
    "Manish", "Mohit", "Nikhil", "Nishant", "Rahul", "Raj", "Rajesh", "Ravi",
    "Rohit", "Sagar", "Sahil", "Shivam", "Siddharth", "Sumit", "Suraj", "Vikram",
    "Vishal", "Vivek", "Yash", "Priya", "Sneha", "Pooja", "Neha", "Anjali",
    "Divya", "Kritika", "Megha", "Nidhi", "Nikita", "Pallavi", "Preeti", "Riya",
    "Sakshi", "Shreya", "Simran", "Sonal", "Swati", "Tanvi", "Tanya", "Trisha",
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Joshi", "Patel", "Shah",
    "Mehta", "Nair", "Reddy", "Iyer", "Malhotra", "Kapoor", "Chopra", "Bhatia",
    "Ahuja", "Sinha", "Rao", "Pillai", "Menon", "Chatterjee", "Banerjee", "Das",
    "Mishra", "Pandey", "Tiwari", "Shukla", "Yadav", "Chauhan", "Saxena", "Agarwal",
]

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat",
]

ITEMS_POOL = [
    ["Kurta", "Dupatta"], ["Jeans", "T-Shirt"], ["Saree"], ["Blazer", "Chinos"],
    ["Dress", "Heels"], ["Ethnic Set"], ["Jacket", "Joggers"], ["Kurti", "Leggings"],
    ["Suit"], ["Casual Shirt", "Shorts"], ["Anarkali"], ["Formal Shirt", "Trousers"],
]


def random_date(days_ago_min: int, days_ago_max: int) -> datetime:
    days_ago = random.randint(days_ago_min, days_ago_max)
    return datetime.utcnow() - timedelta(days=days_ago)


def seed():
    db = SessionLocal()
    try:
        if db.query(Customer).count() > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding customers and orders...")
        customers = []

        for i in range(300):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}{i}@example.com"
            phone = f"9{random.randint(100000000, 999999999)}"
            city = random.choice(CITIES)

            # Customer segments by design:
            # 30% high-value (spend > 10000), 20% inactive (>45 days), rest mixed
            profile = random.random()
            if profile < 0.15:
                # High-value, active
                order_count = random.randint(5, 15)
                total_spend = round(random.uniform(12000, 50000), 2)
                last_order_at = random_date(1, 20)
            elif profile < 0.30:
                # High-value, inactive
                order_count = random.randint(3, 8)
                total_spend = round(random.uniform(8000, 25000), 2)
                last_order_at = random_date(45, 120)
            elif profile < 0.50:
                # Mid-value, active
                order_count = random.randint(2, 6)
                total_spend = round(random.uniform(2000, 8000), 2)
                last_order_at = random_date(5, 30)
            elif profile < 0.70:
                # Low-value, inactive
                order_count = random.randint(1, 3)
                total_spend = round(random.uniform(300, 2000), 2)
                last_order_at = random_date(60, 200)
            else:
                # New customers (recent, low orders)
                order_count = random.randint(1, 2)
                total_spend = round(random.uniform(500, 3000), 2)
                last_order_at = random_date(1, 15)

            customer = Customer(
                name=name,
                email=email,
                phone=phone,
                city=city,
                total_spend=total_spend,
                order_count=order_count,
                last_order_at=last_order_at,
            )
            db.add(customer)
            customers.append(customer)

        db.flush()

        # Create orders
        for customer in customers:
            remaining_spend = customer.total_spend
            for j in range(customer.order_count):
                is_last = j == customer.order_count - 1
                if is_last:
                    amount = round(remaining_spend, 2)
                    order_date = customer.last_order_at
                else:
                    amount = round(random.uniform(300, remaining_spend * 0.6), 2)
                    remaining_spend -= amount
                    order_date = customer.last_order_at + timedelta(days=random.randint(1, 30) * (customer.order_count - j))

                order = Order(
                    customer_id=customer.id,
                    amount=max(amount, 100),
                    items=random.choice(ITEMS_POOL),
                    created_at=order_date,
                )
                db.add(order)

        db.commit()
        print(f"Seeded {len(customers)} customers successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
