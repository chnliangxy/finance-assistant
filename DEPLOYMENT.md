# Local Deployment

## Start

```bash
docker compose up -d --build
```

Open `http://localhost:6605`.

## Persistent Data

All user settings, watchlists, holdings, costs, and P/L source data are stored in SQLite:

```text
./data/finance.db
```

The backend container reads this file through `DATA_DIR=/data`, and Docker maps the local `./data` folder to `/data` inside the container. Rebuilding the image or recreating containers will keep the data as long as this folder is not deleted.

## Backup

```bash
cp ./data/finance.db ./data/finance.backup.db
```

## Recover From An Old Container

If an earlier deployment stored the database inside a container, copy it out before deleting that container:

```bash
docker ps -a
docker cp <backend-container-name-or-id>:/app/data/finance.db ./data/finance.db
```

For newer deployments, the container path is:

```bash
docker cp <backend-container-name-or-id>:/data/finance.db ./data/finance.db
```

## Stop

```bash
docker compose down
```

Do not run `rm -rf ./data` unless you intentionally want to delete all saved configuration.
