"""Export canonical copy plus a source inventory for editorial review."""
import ast
import json
import re
from django.conf import settings
from django.core.management.base import BaseCommand
from letters.content import load_letter

class Command(BaseCommand):
    help = 'Export letter content and potential user-facing source strings as JSON.'

    def handle(self, *args, **options):
        inventory = []
        roots = ['templates', 'letters', 'static/js', 'fixtures', 'content']
        for root in roots:
            for path in sorted((settings.BASE_DIR / root).rglob('*')):
                if not path.is_file() or path.suffix not in {'.html', '.py', '.js', '.json'}:
                    continue
                if path.name in {'extract_content.py', 'tests.py'}:
                    continue
                source = path.read_text(encoding='utf-8')
                candidates = []
                if path.suffix == '.py':
                    candidates = [node.value for node in ast.walk(ast.parse(source)) if isinstance(node, ast.Constant) and isinstance(node.value, str) and ' ' in node.value]
                elif path.suffix == '.html':
                    cleaned = re.sub(r'{[%{].*?[%}]}', '', source, flags=re.S)
                    candidates = [text.strip() for text in re.findall(r'>([^<>]+)<', cleaned) if text.strip()]
                    candidates += re.findall(r'(?:aria-label|title|alt|placeholder|content)="([^"]+)"', cleaned)
                elif path.suffix == '.js':
                    candidates = [m[1] for m in re.findall(r"(['\"])(.*?)\1", source) if ' ' in m[1]]
                else:
                    def strings(value):
                        if isinstance(value, str): yield value
                        elif isinstance(value, dict):
                            for item in value.values(): yield from strings(item)
                        elif isinstance(value, list):
                            for item in value: yield from strings(item)
                    candidates = list(strings(json.loads(source)))
                inventory.append({'source': str(path.relative_to(settings.BASE_DIR)), 'candidates': candidates})
        self.stdout.write(json.dumps({'letter': load_letter(), 'source_inventory': inventory}, ensure_ascii=False, indent=2))
