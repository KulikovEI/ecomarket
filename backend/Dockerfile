FROM php:8.2-cli-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-dev && docker-php-ext-install pdo pdo_pgsql
COPY . .
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "main.php"]