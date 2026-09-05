import json
from django.conf import settings

def load_letter():
    """Read on request so editorial changes do not require a worker restart."""
    return json.loads((settings.BASE_DIR / "content" / "letter.json").read_text(encoding="utf-8"))
