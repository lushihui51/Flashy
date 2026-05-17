import redis

from app.config import settings

r = redis.Redis(
    host=settings.cache_host, port=int(settings.cache_port), decode_responses=True
)

r.set("foo", "bar")
print(r.get("foo"))
