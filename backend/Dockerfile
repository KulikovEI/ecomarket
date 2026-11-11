FROM php:8.2-cli-alpine
WORKDIR /app

RUN apk add --no-cache postgresql-dev git \
    && docker-php-ext-install pdo pdo_pgsql \
    && git clone --depth 1 --branch v6.9.1 https://github.com /app/phpmailer

COPY . .
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "main.php"]