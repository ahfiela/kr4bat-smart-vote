FROM php:8.4-fpm-alpine

# Instal library pendukung dan ekstensi MySQL
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql gd

# Set folder kerja di dalam docker
WORKDIR /var/www

# Salin semua file backend ke dalam docker
COPY . .

# Jalankan PHP-FPM
EXPOSE 9000
CMD ["php-fpm"]
