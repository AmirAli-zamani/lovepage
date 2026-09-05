# Always, you.

A quiet, cinematic love letter in five chapters. Written for two people whose lives became busier while their love remained. Built with native Django templates, HTML, CSS, and vanilla JavaScript. No frontend build step, third-party requests, tracking, or autoplay audio.

## Architecture

- `config/`: environment-based Django settings, root URLs, WSGI.
- `letters/`: view, content loader, health endpoint, tests, editorial export command.
- `content/letter.json`: all romantic copy, chapter order, atmosphere, and ending.
- `templates/base.html`: document shell; `letters/home.html`: opening and navigation; `letters/chapter.html`: reusable chapter.
- `static/css/experience.css`: tokens, layout, celestial illustration, chapters, motion, responsive rules.
- `static/js/experience.js`: progressive reveals, particles, motion preference, chapter tracking, reading progress.

Request → `letters.views.home` → JSON content → server-rendered templates. No custom database models: relationship content is versioned as text, not stored as records. SQLite holds Django's standard auth/session tables. Django 5.2 LTS supports Python 3.14. WhiteNoise serves fingerprinted static assets in production; Gunicorn runs WSGI.

## Local setup

Python 3.14 recommended. Never install dependencies globally.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Paste the generated value into `DJANGO_SECRET_KEY` in `.env`. The supplied local workspace already has a generated, ignored `.env`; do not overwrite it needlessly.

```sh
.venv/bin/python manage.py migrate --plan
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver
```

Visit http://127.0.0.1:8000. On Windows use `py -m venv .venv`, `.venv\Scripts\python.exe` in place of `.venv/bin/python`, and `copy .env.example .env`.

## Environment

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Required random secret; never commit it |
| `DJANGO_DEBUG` | `true` locally; `false` in production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames, without schemes |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Comma-separated HTTPS origins when needed |
| `DJANGO_SECURE_SSL_REDIRECT` | Defaults to `true`; disable only for an HTTP smoke test or a proxy enforcing HTTPS |
| `DATABASE_PATH` | SQLite location; defaults to project `db.sqlite3` |

## Docker

After creating `.env`:

```sh
docker compose up --build
```

Development binds only to localhost:8000, mounts source for reload, runs standard migrations, and persists SQLite in `letter_data`. Do not use `docker compose down -v` unless you intend to delete that database.

Production image:

```sh
docker build --target production -t always-you .
```

Use a separate production environment file with a generated secret, `DJANGO_DEBUG=false`, and your domain. Run migrations as a release step before starting workers:

```sh
docker volume create always-you-data
docker run --rm --env-file .env.production -e DATABASE_PATH=/data/db.sqlite3 -v always-you-data:/data always-you python manage.py migrate --plan
docker run --rm --env-file .env.production -e DATABASE_PATH=/data/db.sqlite3 -v always-you-data:/data always-you python manage.py migrate --noinput
docker run -d --name always-you --restart unless-stopped --env-file .env.production -e DATABASE_PATH=/data/db.sqlite3 -v always-you-data:/data -p 127.0.0.1:8000:8000 always-you
```

The production target runs as a non-root user and collects static files before starting Gunicorn. Deploy behind an HTTPS reverse proxy. With TLS termination, enforce HTTPS at the proxy and set `DJANGO_SECURE_SSL_REDIRECT=false` to prevent redirect loops; configure forwarded-header trust only after defining the trusted proxy boundary. Keep the upstream bound to loopback. Run `manage.py check --deploy` with production settings.

This is an intimate reading experience, but **it does not implement authentication**. `noindex` and `no-store` discourage indexing and caching; they do not restrict access. Before publishing personal content, place the app behind a private network or an authenticated access gateway. No deployment is performed by the setup scripts.

## Database workflow

Before schema changes, commit a checkpoint and back up the database. Modify `letters/models.py`, run `makemigrations letters`, inspect generated migrations and `sqlmigrate`, review `migrate --plan`, then apply `migrate`, test, and commit. Never modify SQLite directly or fake migration state. For rollback, inspect reversibility and use Django migration targets; restore a tested backup for irreversible data changes. Moving to PostgreSQL requires its driver, environment settings, and a reviewed data migration; the current database is deliberately SQLite.

## Static files

Development uses Django's static handler. Production uses WhiteNoise with compressed manifest storage:

```sh
.venv/bin/python manage.py collectstatic --noinput
```

All artwork is CSS or local SVG. Fonts use serif, script, and sans-serif system stacks, so exact typefaces vary by operating system. Add licensed local WOFF2 fonts and `@font-face` rules if identical typography across devices is needed.

## Customize the letter

Edit `content/letter.json` for the opening, titles, paragraphs, whispers, dedication, and signature. Preserve unique URL-safe chapter IDs and the five supported atmosphere names. HTML is escaped by Django. Content reloads on every request. No migration is required for wording changes. Change design tokens in `:root`; keep chapter layout shared.

Export all canonical romantic copy and an inventory of candidate strings in templates, Python (including models/context processors), fixtures, and JavaScript:

```sh
.venv/bin/python manage.py extract_content > /tmp/letter-content.json
```

The canonical `letter` field is exact. `source_inventory` is a review aid, not a semantic parser: it may include technical strings, and dynamically composed text needs manual review. The export contains personal copy; store it privately.

## Animation and accessibility

IntersectionObserver reveals text with opacity, 22px vertical movement, 1.2-second easing, and small stagger delays. Without JavaScript, all copy is visible. Atmospheric light breathes over 16 seconds, the illustration floats over 12 seconds, and each chapter has a bounded 14 particles. A passive scroll listener schedules progress and chapter updates using requestAnimationFrame. The motion control pauses ambient movement and exposes revealed text; operating-system reduced-motion preferences disable decorative animation and smooth scrolling. Motion preference is not persisted across visits.

Navigation uses real anchors, a skip link, visible focus styles, semantic headings, and decorative `aria-hidden` artwork. There is no scroll hijacking or time-limited content. Mobile stacks the opening and removes the desktop chapter rail while retaining continuous reading and anchor links.

## Verification and Git workflow

```sh
.venv/bin/python manage.py check
.venv/bin/python manage.py test
.venv/bin/python manage.py makemigrations --check --dry-run
.venv/bin/python manage.py collectstatic --noinput
docker compose config --quiet
```

Keep `main` as the verified baseline and work on `development`. Commit checkpoints before major features or migrations. Use `git revert <commit>` for shared-history rollback; avoid destructive resets. `.env`, `.venv`, database files, and collected assets are ignored. Repository-local automated commits use the transparent identity `Love Universe Workspace <workspace@localhost>`; replace it with your preferred identity for future work.

### Verified in this workspace

- Four Django tests pass; all standard migrations are applied; no missing model migrations.
- Production `check --deploy` passes; static collection and live Gunicorn/WhiteNoise HTTP checks pass.
- Docker development and production images build; Django checks pass inside the development container.
- Firefox audit passes at widths 320, 390, 768, and 1440: no horizontal overflow, five chapters, start navigation, reveal completion, motion pause, and chapter tracking. Desktop, mobile, and night captures were visually reviewed.
- JavaScript syntax and Git whitespace checks pass. Reduced-motion and no-JavaScript fallbacks were reviewed in source and server-rendering tests; automated browser emulation of those modes has not been run.

Reproduce the dependency-free Firefox audit with Node 22 and Firefox installed. Start the Django server, create a temporary Firefox profile directory, then run Firefox with `--headless --no-remote --profile <absolute-profile-path> --remote-debugging-port 9222 about:blank`. In another terminal run `node scripts/firefox_audit.mjs`. Captures go to ignored `.artifacts/`. Use a fresh browser process after an interrupted audit. `scripts/browser_audit.py` offers an optional Playwright audit, including reduced-motion and JavaScript-disabled contexts; it requires an isolated Playwright installation and Chromium, and was not run during this build.

Implementation references: [Django 5.2 compatibility](https://docs.djangoproject.com/en/5.2/releases/5.2/) and [WhiteNoise deployment](https://whitenoise.readthedocs.io/en/stable/django.html).
