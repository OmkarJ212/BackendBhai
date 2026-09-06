.PHONY: up down reset-db seed build clean

up:
	docker compose up -d

down:
	docker compose down

reset-db:
	docker compose exec -T postgres psql -U app -d devtools -f /docker-entrypoint-initdb.d/01_devtools.sql
	docker compose exec -T postgres psql -U app -d ecommerce -f /docker-entrypoint-initdb.d/02_ecommerce.sql

seed:
	pnpm ts-node db/seed-traces.ts

build:
	pnpm -r build

clean:
	pnpm -r clean
