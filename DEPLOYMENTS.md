# Independent old and new letter deployments

The root application is restored from **86bd9e8**. Its application code, templates, CSS, JavaScript, and story content are unchanged from that commit. Deployment-only changes live on `separate-web-deployments`.

The `new_story/` directory is a Git worktree pinned to **0873413**, containing the beginning-of-relationship story. It is not a copy, submodule, or merged template. Root Git and Docker ignore rules exclude this nested worktree from staging and the old image's build context.

| Service | Source | URL | SQLite volume |
| --- | --- | --- | --- |
| `web` | Root, based on `86bd9e8` | `http://<server-ip>:1403` | `old_letter_data` |
| `web-new` | `new_story/`, at `0873413` | `http://<server-ip>:4051` | `new_letter_data` |

Both databases have the container path `/data/db.sqlite3`, but their Docker volumes are distinct. Compose prefixes volume names with its project name. The previous `letter_data` volume is preserved and unused by these services. These apps store letter content in their own versioned JSON files; no editorial data is transferred through SQLite.

## Start

Keep the existing ignored root `.env` with its generated secret. Set `SERVER_HOST` to the IP or hostname visitors use (no scheme or port); Compose appends it to the explicit `DJANGO_ALLOWED_HOSTS` list. Both services read this environment file and override their database path independently.

The worktree must exist before building. In a fresh checkout of this deployment branch, create it through Git:

```sh
git worktree add ./new_story 0873413
```

Do not rerun worktree creation if it already exists. Then:

```sh
docker compose down
docker compose up --build -d
docker compose ps
curl --fail http://localhost:1403/health/
curl --fail http://localhost:4051/health/
```

Compose overrides each image's original port-8000 command with the required service port; the Dockerfiles are preserved from their original commits. Startup applies Django migrations independently in each volume. Both services are development servers, as requested. Allow inbound TCP 1403 and 4051 in the server/network firewall when remote access is needed.

## History and rollback

- `e1b9c0f`: checkpoint before rollback and separate web deployment; preserves all previously uncommitted changes on `development`.
- `86bd9e8`: old application baseline.
- `0873413`: new-story worktree baseline.

Inspect `git status`, `git log --oneline -10`, and `git worktree list` before changing versions. Commit local edits before switching. Use `git revert` on individual deployment commits if needed; do not reset or delete history. Do not use `docker compose down -v` unless deleting database data is explicitly intended.

The original README describes the standalone application. This document and the root Compose file define the two-service deployment.

## Verified result

Both containers are healthy with `0.0.0.0:1403->1403/tcp` and `0.0.0.0:4051->4051/tcp`. Both `/health/` endpoints return `{"status":"ok"}` and both `/` endpoints return successful, different HTML. Each response was checked against every paragraph and heading in its own source's five chapters. The old response contains the established-relationship wording; the new response contains the friends-introduction narrative and no duration reference.

All four existing Django tests pass in each container, and `migrate --check` passes independently in both. Docker mount inspection confirms `/data` points to `lovepage2_old_letter_data` for `web` and `lovepage2_new_letter_data` for `web-new`. Root application files still match `86bd9e8`; the new worktree remains clean at `0873413`.
