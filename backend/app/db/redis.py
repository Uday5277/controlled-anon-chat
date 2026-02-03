import redis
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    redis_client = redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=2
    )
    # Test connection
    redis_client.ping()
except Exception as e:
    print(f"⚠️  Redis connection failed ({e}). Using in-memory mock.")
    
    # In-memory mock for development (not for production!)
    class MockRedis:
        def __init__(self):
            self.data = {}
        
        def exists(self, key):
            return 1 if key in self.data else 0
        
        def get(self, key):
            return self.data.get(key)
        
        def set(self, key, value):
            self.data[key] = value
        
        def setex(self, key, ttl, value):
            self.data[key] = value
        
        def incr(self, key):
            self.data[key] = int(self.data.get(key, 0)) + 1
            return self.data[key]
        
        def sadd(self, key, *members):
            if key not in self.data:
                self.data[key] = set()
            self.data[key].update(members)
        
        def srem(self, key, member):
            if key in self.data:
                self.data[key].discard(member)
        
        def smembers(self, key):
            return self.data.get(key, set())
        
        def hset(self, key, mapping=None, **kwargs):
            if key not in self.data:
                self.data[key] = {}
            if mapping:
                self.data[key].update(mapping)
            self.data[key].update(kwargs)
        
        def hget(self, key, field):
            return self.data.get(key, {}).get(field)
        
        def delete(self, *keys):
            for key in keys:
                self.data.pop(key, None)
        
        def expire(self, key, ttl):
            pass  # TTL not implemented in mock
        
        def ping(self):
            return True
    
    redis_client = MockRedis()
