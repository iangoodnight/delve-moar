# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM golang:1.26-alpine AS builder

WORKDIR /build

# Cache dependencies separately from source
COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-s -w -X github.com/iangoodnight/dungeon-master/cli/cmd.Version=${VERSION}" \
    -o dm .

# ---------------------------------------------------------------------------
# Runtime — scratch for minimal attack surface and image size
# ---------------------------------------------------------------------------
FROM scratch

COPY --from=builder /build/dm /dm

ENTRYPOINT ["/dm"]
