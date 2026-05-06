# syntax=docker/dockerfile:1

FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/morfoschools-api ./cmd/api

FROM alpine:3.20 AS runner
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /out/morfoschools-api /app/morfoschools-api
USER app
EXPOSE 8080
CMD ["/app/morfoschools-api"]
