import io
import json
from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from .content import load_letter

@override_settings(STORAGES={'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}})
class LetterTests(SimpleTestCase):
    def test_letter_renders_all_chapters_without_javascript(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        story = load_letter()
        self.assertEqual(len(story['chapters']), 5)
        self.assertEqual(len({c['id'] for c in story['chapters']}), 5)
        for chapter in story['chapters']:
            self.assertContains(response, f'id="{chapter["id"]}"')
            for paragraph in chapter['paragraphs']:
                self.assertContains(response, paragraph)
        self.assertContains(response, story['signature'])
        self.assertEqual(response['X-Robots-Tag'], 'noindex, nofollow, noarchive')
        self.assertIn('no-store', response['Cache-Control'])

    def test_health(self):
        self.assertEqual(self.client.get('/health/').json(), {'status': 'ok'})

    def test_export_includes_canonical_copy_and_sources(self):
        output = io.StringIO()
        call_command('extract_content', stdout=output)
        export = json.loads(output.getvalue())
        self.assertEqual(export['letter'], load_letter())
        sources = {entry['source'] for entry in export['source_inventory']}
        self.assertIn('templates/letters/home.html', sources)
        self.assertIn('static/js/experience.js', sources)
        self.assertIn('letters/models.py', sources)

    @override_settings(DEBUG=False, SECURE_SSL_REDIRECT=True)
    def test_production_redirects_to_https(self):
        self.assertEqual(self.client.get('/').status_code, 301)
        response = self.client.get('/', secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn('max-age=31536000', response['Strict-Transport-Security'])
