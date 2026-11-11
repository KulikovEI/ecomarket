-- 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ И ПАРТНЕРОВ
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'client',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar TEXT DEFAULT '/images/default-avatar.png',
    shop_name VARCHAR(150) DEFAULT NULL,
    shop_description TEXT DEFAULT NULL,           
    shop_avatar TEXT DEFAULT '/images/default-avatar.png' 
);

-- 2. ТАБЛИЦА ТОВАРОВ (ID ИМЕЕТ СТРОКОВЫЙ ТИП VARCHAR)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    old_price INT DEFAULT NULL,
    discount INT DEFAULT NULL,
    carbon_footprint NUMERIC(4,2) NOT NULL,
    image VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    vendor_id INT REFERENCES users(id) ON DELETE SET NULL DEFAULT 1
);

-- 3. ТАБЛИЦА ГОЛОВНЫХ ЗАКАЗОВ
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_price INT NOT NULL,
    total_co2 NUMERIC(6,2) NOT NULL,
    delivery_method VARCHAR(50) NOT NULL,
    delivery_address TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ТАБЛИЦА СОДЕРЖИМОГО ЗАКАЗОВ (ИСПРАВЛЕНО: product_id ИМЕЕТ ТИП VARCHAR)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL, 
    price INT NOT NULL, 
    quantity INT NOT NULL
);

-- 5. ТАБЛИЦА ТЕКУЩИХ КОРЗИН (ИСПРАВЛЕНО: product_id ИМЕЕТ ТИП VARCHAR)
CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id VARCHAR(100) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1
);

-- 6. ТАБЛИЦА ОТЗЫВОВ К ТОВАРАМ (ИСПРАВЛЕНО: product_id ИМЕЕТ ТИП VARCHAR)
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, email, password, role, first_name, last_name, phone, shop_name) VALUES
(1, 'admin@admin', 'admin', 'admin', 'Главный', 'Администратор', '88005553535', 'EcoMarket')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, category, price, old_price, discount, carbon_footprint, image, description, vendor_id) VALUES
('1', 'Бамбуковая зубная щетка', 'Ванная', 250, NULL, NULL, 0.10, '/images/toothbrush.webp', '100% биоразлагаемая рукоятка, нейлон без BPA.', 1),
('2', 'Многоразовые мешочки для овощей', 'Кухня', 150, NULL, NULL, 0.05, '/images/bags.webp', 'Заменяют до 1000 одноразовых пластиковых пакетов.', 1),
('3', 'Твердый шампунь для волос', 'Ванная', 450, NULL, NULL, 0.20, '/images/shampoo.webp', 'Без пластиковой упаковки. Концентрат, хватает надолго.', 1),
('4', 'Стеклянный контейнер для еды', 'Кухня', 600, NULL, NULL, 0.80, '/images/container.jpg', 'Крышка из натурального бамбука, герметичный силикон.', 1),
('5', 'Стальная бутылка для воды', 'Стиль жизни', 1200, NULL, NULL, 1.20, '/images/bottle.webp', 'Нержавеющая сталь. Сохраняет холод 24 часа, тепло 12 часов.', 1),
('6', 'Футболка из organic-хлопка', 'Одежда', 1500, NULL, NULL, 2.10, '/images/t-shirt.webp', 'Выращено без пестицидов, окрашено безопасными красителями.', 1),
('7', 'Многоразовые диски для лица', 'Ванная', 350, NULL, NULL, 0.08, '/images/disc.webp', 'Комплект из 10 штук из бамбукового волокна для снятия макияжа.', 1),
('8', 'Деревянная щетка для посуды', 'Кухня', 400, NULL, NULL, 0.15, '/images/brush.webp', 'Бук и натуральная щетина сизаля. Заменяет пластиковые губки.', 1),
('9', 'Сумка-шоппер из переработанного пластика', 'Стиль жизни', 850, NULL, NULL, 0.50, '/images/bag.webp', 'Сделана из вторичного сырья. Очень прочная и вместительная.', 1),
('10', 'Эко-свеча из соевого воска', 'Дом', 650, NULL, NULL, 0.30, '/images/candle.webp', 'Натуральный воск, деревянный фитиль с эффектом потрескивания.', 1),
('11', 'Эко-губка из люффы для тела', 'Ванная', 290, NULL, NULL, 0.06, '/images/sponge.jpg', 'Натуральное гипоаллергенное волокно из тыквы люффы. Массажный эффект.', 1),
('12', 'Деревянные кухонные лопатки', 'Кухня', 750, NULL, NULL, 0.22, '/images/spatulas.jpg', 'Набор из 3-х предметов из цельного экологически чистого можжевельника.', 1),
('13', 'Льняная скатерть «Хюгге»', 'Дом', 1500, NULL, NULL, 1.10, '/images/tablecloth.jpg', '100% натуральный неотбеленный лен премиального качества для уютных вечеров.', 1),
('14', 'Набор органической зелени для супа', 'Кухня', 190, 400, 90, 0.12, '/images/soup.jpg', 'Свежая локальная зелень: лук, петрушка, укроп и сельдерей в био-упаковке.', 1),
('15', 'Натуральное кокосовое мыло', 'Ванная', 200, 1000, 80, 0.04, '/images/soap.jpg', 'Растительная основа, не сушит кожу, полностью разлагается в сточных водах.', 1),
('16', 'Пакет суповой «Восточный веган»', 'Кухня', 90, 300, 90, 0.18, '/images/ramen.jpg', 'Сушеные эко-овощи, лапша из твердых сортов пшеницы и натуральные специи.', 1),
('17', 'Эко-набор бамбуковых соломинок', 'Стиль жизни', 300, 800, 80, 0.02, '/images/straws.jpg', '10 штук многоразовых трубочек из цельного бамбука + ершик для чистки.', 1)
ON CONFLICT (id) DO NOTHING;
