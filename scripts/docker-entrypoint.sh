#!/bin/sh
set -eu

node ./scripts/run-drizzle-migrations.mjs
exec node build
