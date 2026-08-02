from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base
import datetime

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Integer, nullable=True)  # in seconds
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)

class Detection(Base):
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True, index=True)
    object_name = Column(String, index=True)
    confidence = Column(Float)
    position = Column(String)  # left, right, center
    source_type = Column(String)  # camera, image, video
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Command(Base):
    __tablename__ = "commands"
    id = Column(Integer, primary_key=True, index=True)
    command = Column(String, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String)
    favorite = Column(Boolean, default=False)

class NavigationLog(Base):
    __tablename__ = "navigation_logs"
    id = Column(Integer, primary_key=True, index=True)
    destination = Column(String, index=True)
    distance = Column(Float)  # in meters or km
    duration = Column(Integer) # in seconds
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Gesture(Base):
    __tablename__ = "gestures"
    id = Column(Integer, primary_key=True, index=True)
    gesture_name = Column(String, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
