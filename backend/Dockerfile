FROM php:8.2-cli-alpine
WORKDIR /app

# Копируем чистый бинарник Composer без установки лишнего PHP из Alpine
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Устанавливаем драйвер PostgreSQL и PHPMailer
RUN apk add --no-cache postgresql-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && composer require phpmailer/phpmailer

COPY . .
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "main.php"]