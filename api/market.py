"""
Vercel Serverless Function for FastAPI Market Service
Wraps the FastAPI app from server/main.py using Mangum
"""
import sys
import os

# Add server directory to path so we can import main
server_dir = os.path.join(os.path.dirname(__file__), '..', 'server')
sys.path.insert(0, server_dir)

from server.main import app
from mangum import Mangum

# Wrap FastAPI app with Mangum for serverless compatibility
# Vercel's Python runtime supports ASGI apps via Mangum
handler = Mangum(app, lifespan="off")

# Export handler for Vercel
__all__ = ['handler']

