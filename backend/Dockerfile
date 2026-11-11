FROM php:8.2-cli-alpine
WORKDIR /app

RUN apk add --no-cache postgresql-dev curl unzip \
    && docker-php-ext-install pdo pdo_pgsql \
    && curl -L https://github.com -o phpmailer.zip \
    && unzip phpmailer.zip \
    && mv PHPMailer-6.9.1 /app/phpmailer \
    && rm phpmailer.zip

COPY . .
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "main.php"]