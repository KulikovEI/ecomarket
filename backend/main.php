<?php
ob_start();

if (file_exists(__DIR__ . '/phpmailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/phpmailer/src/Exception.php';
    require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/phpmailer/src/SMTP.php';
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = getenv('DB_HOST') ?: 'postgres_db';
$port = getenv('DB_PORT') ?: '5432';
$db_name = getenv('DB_NAME') ?: 'ecomarket_db';
$user = getenv('DB_USER') ?: 'user';
$password = getenv('DB_PASSWORD') ?: 'user';
$sslmode = getenv('DB_SSLMODE') ?: 'disable'; // Для Supabase ставим 'require'

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db_name;sslmode=$sslmode";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(["error" => "Ошибка подключения к БД: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit();
}

$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

header('Content-Type: application/json; charset=utf-8');


// 1. ИЗОЛИРОВАННОЕ КАСКАДНОЕ УДАЛЕНИЕ ТОВАРОВ (DELETE /api/products/{id})
if ($method === 'PUT' || $method === 'DELETE') {
    $urlParts = explode('/', $request_uri);
    $productId = trim(end($urlParts)); 
    $currentUserId = 0;
    if (preg_match('#userId=([0-9]+)#', $_SERVER['REQUEST_URI'], $userMatches)) {
        $currentUserId = (int)$userMatches[1];
    }

    if (empty($productId)) {
        http_response_code(400);
        echo json_encode(["error" => "Не удалось прочитать ID товара из адреса"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    $prodStmt = $pdo->prepare("SELECT id, vendor_id FROM products WHERE id = ?");
    $prodStmt->execute([$productId]);
    $product = $prodStmt->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(["error" => "Товар не найден в базе данных СУБД"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === 'PUT') {
        if (empty($input['name']) || empty($input['price'])) {
            http_response_code(400);
            echo json_encode(["error" => "Недостаточно данных для обновления товара"], JSON_UNESCAPED_UNICODE);
            exit();
        }

        try {
            $discount = isset($input['discount']) && $input['discount'] > 0 ? (int)$input['discount'] : null;
            $inputPrice = (int)$input['price'];
            $price = $inputPrice;
            $old_price = null;

            if ($discount !== null && $discount < 100) {
                $old_price = $inputPrice; 
                $price = (int)round($inputPrice * (1 - ($discount / 100))); 
            }
            $stmt = $pdo->prepare("UPDATE products SET name = ?, category = ?, price = ?, old_price = ?, discount = ?, carbon_footprint = ?, image = ?, description = ? WHERE id = ?");
            $stmt->execute([
                $input['name'],
                $input['category'],
                $price,
                $old_price,
                $discount,
                $input['carbonFootprint'],
                $input['image'],
                $input['description'],
                $productId
            ]);

            http_response_code(200);
            echo json_encode(["status" => "success", "updatedId" => $productId], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Ошибка СУБД при обновлении: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }
    if ($method === 'DELETE') {
        $pdo->beginTransaction();
        try {
            $pdo->exec("SET CONSTRAINTS ALL DEFERRED");

            $pdo->prepare("DELETE FROM cart_items WHERE product_id = ?")->execute([$productId]);
            $pdo->prepare("DELETE FROM reviews WHERE product_id = ?")->execute([$productId]);
            $pdo->prepare("UPDATE order_items SET product_id = NULL WHERE product_id = ?")->execute([$productId]);

            $deleteStmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $deleteStmt->execute([$productId]);

            $pdo->commit(); 
            
            http_response_code(200);
            echo json_encode(["status" => "success", "deletedId" => $productId], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            $pdo->rollBack(); 
            http_response_code(500);
            echo json_encode(["error" => "Ошибка СУБД при удалении: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit();
    }
}

// ==========================================================================
// 15. ПОЛУЧЕНО ИСПРАВЛЕНИЕ: Полное соответствие колонкам delivery_address и delivery_method
// ==========================================================================
if (strpos($request_uri, 'user/orders') !== false && $method === 'GET') {
    $userId = isset($_GET['userId']) ? (int)$_GET['userId'] : 0;
    
    // Мягкий разбор ID, если докер-окружение передает параметры строкой
    if (preg_match('#userId=([0-9]+)#', $_SERVER['REQUEST_URI'], $userMatches)) {
        $userId = (int)$userMatches[1];
    }

    if ($userId === 0) {
        http_response_code(400);
        echo json_encode(["error" => "Не указан ID пользователя"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        // СИНХРОНИЗИРОВАНО С ВАШИМ SQL: Выбираем строго существующие delivery_address и delivery_method
        $stmt = $pdo->prepare("
            SELECT 
                id, 
                created_at AS \"createdAt\", 
                status, 
                total_price AS \"totalPrice\", 
                total_co2 AS \"totalCo2\", 
                delivery_address AS \"deliveryAddress\", 
                delivery_method AS \"deliveryMethod\" 
            FROM orders 
            WHERE user_id = ? 
            ORDER BY id DESC
        ");
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();

        // Каскадно вытаскиваем купленные товары для каждого найденного заказа
        foreach ($orders as &$order) {
            $order['id'] = (int)$order['id'];
            $order['totalPrice'] = (int)$order['totalPrice'];
            $order['totalCo2'] = (float)$order['totalCo2'];

            $itemsStmt = $pdo->prepare("
                SELECT oi.quantity, oi.price, p.name, p.image 
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            ");
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
        }

        http_response_code(200);
        echo json_encode($orders, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка СУБД истории заказов: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}


// ==========================================================================
// 16. ИНТЕРАКТИВНАЯ ОТМЕНА ЗАКАЗА ПОЛЬЗОВАТЕЛЕМ (POST /api/orders/cancel)
// ==========================================================================
if (strpos($request_uri, 'orders/cancel') !== false && $method === 'POST') {
    if (empty($input['orderId']) || empty($input['userId'])) {
        http_response_code(400);
        echo json_encode(["error" => "Недостаточно данных для отмены заказа"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        // Проверяем, существует ли заказ, принадлежит ли он пользователю и можно ли его отменить
        $stmt = $pdo->prepare("SELECT status FROM orders WHERE id = ? AND user_id = ?");
        $stmt->execute([(int)$input['orderId'], (int)$input['userId']]);
        $order = $stmt->fetch();

        if (!$order) {
            http_response_code(404);
            echo json_encode(["error" => "Заказ не найден или у вас нет прав на его отмену"], JSON_UNESCAPED_UNICODE);
            exit();
        }

        if ($order['status'] !== 'pending') {
            http_response_code(400);
            echo json_encode(["error" => "Нельзя отменить заказ, который уже передан в доставку или выполнен"], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Обновляем статус заказа в PostgreSQL на 'cancelled'
        $updateStmt = $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?");
        $updateStmt->execute([(int)$input['orderId']]);

        echo json_encode(["status" => "success", "orderId" => (int)$input['orderId']], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка СУБД при отмене заказа: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}


// 2. ИЗОЛИРОВАННОЕ ОБНОВЛЕНИЕ АВАТАРА ПОЛЬЗОВАТЕЛЯ (POST /api/user/update-avatar)
if (strpos($request_uri, 'user/update-avatar') !== false && $method === 'POST') {
    if (empty($input['userId']) || empty($input['avatar'])) {
        http_response_code(400);
        echo json_encode(["error" => "Недостаточно данных для обновления аватара"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?");
        $stmt->execute([$input['avatar'], (int)$input['userId']]);
        
        http_response_code(200);
        echo json_encode(["status" => "success", "avatar" => $input['avatar']], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка СУБД при сохранении аватара: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ==========================================================================
// 14. ОБНОВЛЕНИЕ НАСТРОЕК ЭКО-МАРКЕТА ПРОДАВЦА (POST /api/vendor/update-shop)
// ==========================================================================
if (strpos($request_uri, 'vendor/update-shop') !== false && $method === 'POST') {
    if (empty($input['userId']) || empty($input['shopName'])) {
        http_response_code(400);
        echo json_encode(["error" => "Название магазина и ID пользователя обязательны для заполнения"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    try {
        $shopDescription = !empty($input['shopDescription']) ? trim($input['shopDescription']) : null;
        $shopAvatar = !empty($input['shopAvatar']) ? $input['shopAvatar'] : '/images/default-avatar.png';

        // Обновляем бренд-данные продавца в PostgreSQL
        $stmt = $pdo->prepare("UPDATE users SET shop_name = ?, shop_description = ?, shop_avatar = ? WHERE id = ?");
        $stmt->execute([
            trim($input['shopName']),
            $shopDescription,
            $shopAvatar,
            (int)$input['userId']
        ]);
        
        http_response_code(200);
        echo json_encode([
            "status" => "success", 
            "shopName" => $input['shopName'],
            "shopDescription" => $shopDescription,
            "shopAvatar" => $shopAvatar
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка СУБД при сохранении настроек маркета: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ==========================================================================
// 17. ПОЛУЧЕНИЕ ЗАКАЗОВ С РАЗДЕЛЕНИЕМ ПРАВ (ADMIN — ВСЕ, VENDOR — ТОЛЬКО СВОИ)
// ==========================================================================
if (strpos($request_uri, 'admin/orders') !== false && $method === 'GET') {
    $role = isset($_GET['role']) ? trim($_GET['role']) : 'admin';
    $vendorId = isset($_GET['vendorId']) ? (int)$_GET['vendorId'] : 0;

    if (preg_match('#role=([a-zA-Z]+)#', $_SERVER['REQUEST_URI'], $roleMatches)) {
        $role = $roleMatches[1];
    }
    if (preg_match('#vendorId=([0-9]+)#', $_SERVER['REQUEST_URI'], $vendorMatches)) {
        $vendorId = (int)$vendorMatches[1];
    }

    try {
         if ($role === 'vendor' && $vendorId > 0) {
            $stmt = $pdo->prepare("
                SELECT DISTINCT
                    o.id, 
                    o.created_at AS \"createdAt\", 
                    o.status, 
                    o.total_price AS \"totalPrice\", 
                    o.total_co2 AS \"totalCo2\", 
                    o.delivery_address AS \"deliveryAddress\", 
                    o.delivery_method AS \"deliveryMethod\",
                    u.first_name AS \"firstName\",
                    u.last_name AS \"lastName\",
                    u.email
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                INNER JOIN order_items oi ON o.id = oi.order_id
                INNER JOIN products p ON oi.product_id = p.id
                WHERE p.vendor_id = ?
                ORDER BY o.id ASC
            ");
            $stmt->execute([$vendorId]);
        } else {
            $stmt = $pdo->query("
                SELECT 
                    o.id, 
                    o.created_at AS \"createdAt\", 
                    o.status, 
                    o.total_price AS \"totalPrice\", 
                    o.total_co2 AS \"totalCo2\", 
                    o.delivery_address AS \"deliveryAddress\", 
                    o.delivery_method AS \"deliveryMethod\",
                    u.first_name AS \"firstName\",
                    u.last_name AS \"lastName\",
                    u.email
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.id ASC
            ");
        }

        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $order['id'] = (int)$order['id'];
            $order['totalPrice'] = (int)$order['totalPrice'];
            $order['totalCo2'] = (float)$order['totalCo2'];

            if ($role === 'vendor' && $vendorId > 0) {
                // Внутри заказа продавец видит только позиции своего магазина
                $itemsStmt = $pdo->prepare("
                    SELECT oi.quantity, oi.price, p.name, p.image 
                    FROM order_items oi
                    INNER JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ? AND p.vendor_id = ?
                ");
                $itemsStmt->execute([$order['id'], $vendorId]);
            } else {
                $itemsStmt = $pdo->prepare("
                    SELECT oi.quantity, oi.price, p.name, p.image 
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                ");
                $itemsStmt->execute([$order['id']]);
            }

            $order['items'] = $itemsStmt->fetchAll();
        }

        http_response_code(200);
        echo json_encode($orders, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка СУБД заказов: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ==========================================================================
// 18. ОБНОВЛЕНИЕ СТАТУСА ЗАКАЗА ПРОДАВЦОМ (POST /api/admin/update-order-status)
// ==========================================================================
if (strpos($request_uri, 'admin/update-order-status') !== false && $method === 'POST') {
    if (empty($input['orderId']) || empty($input['status'])) {
        http_response_code(400);
        echo json_encode(["error" => "Недостаточно данных для обновления статуса"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        // Намертво перезаписываем новый статус заказа в СУБД PostgreSQL
        $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmt->execute([trim($input['status']), (int)$input['orderId']]);

        http_response_code(200);
        echo json_encode(["status" => "success", "orderId" => (int)$input['orderId']], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка СУБД обновления статуса: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ==========================================================================
// 19. ПОЛУЧЕНИЕ ПУБЛИЧНОЙ ИНФОРМАЦИИ О МАГАЗИНЕ (GET /api/shop?vendorId=...)
// ==========================================================================
if (strpos($request_uri, 'shop') !== false && strpos($request_uri, 'update-shop') === false && $method === 'GET') {
    $vendorId = isset($_GET['vendorId']) ? (int)$_GET['vendorId'] : 0;

    if (preg_match('#vendorId=([0-9]+)#', $_SERVER['REQUEST_URI'], $matches)) {
        $vendorId = (int)$matches[1];
    }

    if ($vendorId === 0) {
        http_response_code(400);
        echo json_encode(["error" => "Не указан ID магазина"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 
                id, 
                first_name AS \"firstName\",
                shop_name AS \"shopName\", 
                shop_description AS \"shopDescription\", 
                shop_avatar AS \"shopAvatar\" 
            FROM users 
            WHERE id = ?
        ");
        $stmt->execute([$vendorId]);
        $shop = $stmt->fetch();

        if (!$shop) {
            http_response_code(404);
            echo json_encode(["error" => "Магазин не найден"], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $shop['id'] = (int)$shop['id'];
        if (empty($shop['shopName'])) {
            $shop['shopName'] = 'EcoMarket Partner';
        }
        if (empty($shop['shopDescription'])) {
            $shop['shopDescription'] = 'Официальный эко-партнёр платформы EcoMarket. Натуральные и безопасные товары для осознанного образа жизни.';
        }

        http_response_code(200);
        echo json_encode($shop, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка СУБД магазина: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}


// ==========================================================================
// ОТПРАВКА 6-ЗНАЧНОГО КОДА ЧЕРЕЗ SMTP (ЯНДЕКС / MAIL.RU)
// ==========================================================================
function sendVerificationEmail($toEmail, $firstName, $code) {
    $smtpHost = getenv('SMTP_HOST') ?: ''; // smtp.yandex.ru или smtp.mail.ru
    $smtpUser = getenv('SMTP_USER') ?: ''; // ваша_почта@yandex.ru или @mail.ru
    $smtpPass = getenv('SMTP_PASS') ?: ''; // пароль приложения

    if (empty($smtpHost) || empty($smtpUser) || empty($smtpPass)) {
        return true; // Заглушка, если настройки ещё не добавлены на Render
    }

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = $smtpHost;
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtpUser;
        $mail->Password   = $smtpPass;
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = 465;
        $mail->CharSet    = 'UTF-8';

        // Отправитель (обязательно должен совпадать с $smtpUser)
        $mail->setFrom($smtpUser, 'EcoMarket');
        // Получатель (любой email нового пользователя)
        $mail->addAddress($toEmail, $firstName);

        $mail->isHTML(true);
        $mail->Subject = 'Код подтверждения регистрации в EcoMarket 🍃';
        $mail->Body    = "
            <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #d8f3dc; border-radius: 12px; max-width: 480px;'>
                <h2 style='color: #1b4332;'>Добро пожаловать в EcoMarket, {$firstName}! 🌿</h2>
                <p style='color: #334155;'>Ваш проверочный код для завершения регистрации:</p>
                <div style='font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #2d6a4f; background: #f1f8f5; padding: 14px; text-align: center; border-radius: 8px; margin: 16px 0;'>
                    {$code}
                </div>
                <p style='font-size: 12px; color: #94a3b8;'>Если вы не регистрировались на нашей платформе, просто проигнорируйте это письмо.</p>
            </div>
        ";

        $mail->send();
        return true;
    } catch (\Exception $e) {
        error_log("Ошибка отправки SMTP: " . $mail->ErrorInfo);
        return false;
    }
}

// ==========================================================================
// 3. Регистрация с отправкой кода подтверждения (POST /api/register)
// ==========================================================================
if ($request_uri === '/api/register' && $method === 'POST') {
    $email = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';
    $first_name = trim($input['firstName'] ?? '');
    $last_name = trim($input['lastName'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $shop_name = trim($input['shopName'] ?? '');
    
    if (empty($email) || empty($password) || empty($first_name) || empty($last_name)) {
        http_response_code(400);
        echo json_encode(["error" => "Все обязательные поля должны быть заполнены"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    $role = 'client';
    if (strpos($email, 'admin') !== false) {
        $role = 'admin';
    } 

    try {
        // Проверяем, существует ли уже такой Email
        $checkStmt = $pdo->prepare("SELECT id, is_verified FROM users WHERE email = ?");
        $checkStmt->execute([$email]);
        $existingUser = $checkStmt->fetch();

        $verificationCode = (string)random_int(100000, 999999);
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        if ($existingUser) {
            if ($existingUser['is_verified']) {
                http_response_code(400);
                echo json_encode(["error" => "Пользователь с таким Email уже существует"], JSON_UNESCAPED_UNICODE);
                exit();
            } else {
                // Если аккаунт создали, но почту не подтвердили — перезаписываем данные и шлём новый код
                $upd = $pdo->prepare("
                    UPDATE users 
                    SET password = ?, role = ?, first_name = ?, last_name = ?, phone = ?, shop_name = ?, verification_code = ? 
                    WHERE id = ?
                ");
                $upd->execute([$hashedPassword, $role, $first_name, $last_name, $phone, $shop_name, $verificationCode, $existingUser['id']]);
            }
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO users (email, password, role, first_name, last_name, phone, shop_name, avatar, is_verified, verification_code) 
                VALUES (?, ?, ?, ?, ?, ?, ?, '/images/default-avatar.png', FALSE, ?)
            ");
            $stmt->execute([$email, $hashedPassword, $role, $first_name, $last_name, $phone, $shop_name, $verificationCode]);
        }

        // Отправляем письмо с 6-значным кодом
        sendVerificationEmail($email, $first_name, $verificationCode);

        http_response_code(200);
        echo json_encode([
            "status" => "verification_required",
            "email" => $email,
            "message" => "Код подтверждения отправлен на Email"
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка при регистрации: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ==========================================================================
// 3.1. Проверка 6-значного кода подтверждения почты (POST /api/verify-email)
// ==========================================================================
if ($request_uri === '/api/verify-email' && $method === 'POST') {
    $email = trim(strtolower($input['email'] ?? ''));
    $code = trim($input['code'] ?? '');

    if (empty($email) || empty($code)) {
        http_response_code(400);
        echo json_encode(["error" => "Введите код из письма"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            SELECT id, email, role, first_name AS \"firstName\", last_name AS \"lastName\", 
                   phone, shop_name AS \"shopName\", shop_description AS \"shopDescription\", 
                   shop_avatar AS \"shopAvatar\", avatar 
            FROM users 
            WHERE email = ? AND verification_code = ?
        ");
        $stmt->execute([$email, $code]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(400);
            echo json_encode(["error" => "Неверный код подтверждения! Проверьте письмо."], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // Активируем пользователя и удаляем одноразовый код
        $upd = $pdo->prepare("UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE id = ?");
        $upd->execute([$user['id']]);

        $user['id'] = (int)$user['id'];

        http_response_code(200);
        echo json_encode([
            "status" => "verified",
            "user" => $user
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка проверки кода: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}
// 4. Авторизация (POST /api/login)
if ($request_uri === '/api/login' && $method === 'POST') {
    $email = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';
    
    $stmt = $pdo->prepare("
        SELECT id, email, password, role, is_verified,
               first_name AS \"firstName\", 
               last_name AS \"lastName\", 
               phone, 
               shop_name AS \"shopName\", 
               shop_description AS \"shopDescription\", 
               shop_avatar AS \"shopAvatar\", 
               avatar 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    // Проверяем совпадение пароля (обычный текст для демо-аккаунтов ИЛИ хэш для новых)
    $isPasswordValid = $user && ($password === $user['password'] || password_verify($password, $user['password']));

    if ($isPasswordValid) {
        // Блокируем вход, если пользователь ещё не ввёл 6-значный код из письма
        if (isset($user['is_verified']) && !$user['is_verified']) {
            http_response_code(403);
            echo json_encode(["error" => "Электронная почта не подтверждена! Проверьте письмо с кодом."], JSON_UNESCAPED_UNICODE);
            exit();
        }

        unset($user['password'], $user['is_verified']);
        $user['id'] = (int)$user['id'];
        echo json_encode($user, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Неверный Email или пароль"], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 5. Каталог товаров (GET/POST /api/products)
if (strpos($request_uri, '/api/products') === 0) {
    if ($method === 'GET') {
        // ИСПРАВЛЕНО: Добавлена выгрузка логотипа (shopAvatar) и описания (shopDescription) продавца на витрину
        $query = "SELECT p.id, p.name, p.category, p.price, p.old_price AS \"oldPrice\", p.discount, 
                         p.carbon_footprint AS \"carbonFootprint\", p.image, p.description, p.vendor_id AS \"vendorId\",
                         COALESCE(u.shop_name, 'EcoMarket') AS \"shopName\",
                         COALESCE(u.shop_avatar, '/images/default-avatar.png') AS \"shopAvatar\",
                         u.shop_description AS \"shopDescription\"
                  FROM products p 
                  LEFT JOIN users u ON p.vendor_id = u.id 
                  ORDER BY p.id DESC";
        $stmt = $pdo->query($query);
        $products = $stmt->fetchAll();
        
        foreach ($products as &$p) {
            $p['price'] = (int)$p['price'];
            $p['oldPrice'] = $p['oldPrice'] !== null ? (int)$p['oldPrice'] : null;
            $p['discount'] = $p['discount'] !== null ? (int)$p['discount'] : null;
            $p['carbonFootprint'] = (float)$p['carbonFootprint'];
            $p['vendorId'] = $p['vendorId'] !== null ? (int)$p['vendorId'] : null;
        }
        echo json_encode($products, JSON_UNESCAPED_UNICODE);
    } elseif ($method === 'POST') {
        $id = "prod-" . bin2hex(random_bytes(6)) . "-" . time();
        
        $discount = isset($input['discount']) && $input['discount'] > 0 ? (int)$input['discount'] : null;
        $inputPrice = (int)$input['price']; 
        $vendorId = isset($input['vendorId']) ? (int)$input['vendorId'] : 1;
        
        $price = $inputPrice;
        $old_price = null;

        if ($discount !== null && $discount < 100) {
            $old_price = $inputPrice; 
            $price = (int)round($inputPrice * (1 - ($discount / 100))); 
        }

        $stmt = $pdo->prepare("INSERT INTO products (id, name, category, price, old_price, discount, carbon_footprint, image, description, vendor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, 
            $input['name'], 
            $input['category'], 
            $price,      
            $old_price, 
            $discount,   
            $input['carbonFootprint'], 
            $input['image'], 
            $input['description'],
            $vendorId
        ]);
        
        $input['id'] = $id;
        $input['price'] = $price;
        $input['oldPrice'] = $old_price;
        $input['discount'] = $discount;
        $input['vendorId'] = $vendorId;

        echo json_encode($input, JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 6. Работа с корзиной пользователей (/api/cart/{userId})
if (preg_match('#^/api/cart/([0-9]+)$#', $request_uri, $matches)) {
    $userId = (int)$matches[1];
    if ($method === 'GET') {
        $query = "SELECT c.cart_item_id AS \"cartItemId\", p.id, p.name, p.category, p.price, p.carbon_footprint AS \"carbonFootprint\", p.image, p.description, c.quantity 
                  FROM cart_items c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$userId]);
        $items = $stmt->fetchAll();
        
        foreach ($items as &$item) {
            $item['price'] = (int)$item['price'];
            $item['carbonFootprint'] = (float)$item['carbonFootprint'];
            $item['quantity'] = (int)$item['quantity'];
        }
        echo json_encode($items, JSON_UNESCAPED_UNICODE);
    } 
    exit();
}

// 7. Синхронизация корзины (/api/cart/{userId}/sync)
if (preg_match('#^/api/cart/([0-9]+)/sync$#', $request_uri, $matches)) {
    $userId = (int)$matches[1];
    if ($method === 'POST') {
        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([$userId]);
            $stmt = $pdo->prepare("INSERT INTO cart_items (cart_item_id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)");
            foreach ($input as $item) {
                $cartItemId = "cart-item-" . bin2hex(random_bytes(4)) . "-" . $item['id'];
                $stmt->execute([$cartItemId, $userId, $item['id'], (int)$item['quantity']]);
            }
            $pdo->commit();
            echo json_encode(["status" => "success"], JSON_UNESCAPED_UNICODE);
       } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Ошибка синхронизации: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
       }
    }
    exit();
}


// 8. Создание нового заказа (POST /api/orders)
if ($request_uri === '/api/orders' && $method === 'POST') {
    if (empty($input['userId']) || empty($input['items'])) {
        http_response_code(400);
        echo json_encode(["error" => "Ошибка: заказ пуст"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO orders (user_id, total_price, total_co2, delivery_method, delivery_address) VALUES (?, ?, ?, ?, ?) RETURNING id");
        $stmt->execute([
            (int)$input['userId'],
            (int)$input['totalPrice'],
            (float)$input['totalCo2'],
            $input['deliveryMethod'],
            $input['deliveryAddress']
        ]);
        $order = $stmt->fetch();
        $orderId = $order['id'];

        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (?, ?, ?, ?)");
        foreach ($input['items'] as $item) {
            $stmtItem->execute([
                (int)$orderId,
                $item['id'],
                (int)$item['price'],
                (int)$item['quantity']
            ]);
        }
        $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([(int)$input['userId']]);
        $pdo->commit();
        echo json_encode(["status" => "success", "orderId" => (int)$orderId], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Ошибка оформления заказа: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 9. Получение истории заказов пользователя (GET /api/orders/{userId})
if (preg_match('#^/api/orders/([0-9]+)$#', $request_uri, $matches)) {
    $userId = (int)$matches[1];
    
    if ($method === 'GET') {
        try {
            $stmt = $pdo->prepare("SELECT id, total_price AS \"totalPrice\", total_co2 AS \"totalCo2\", delivery_method AS \"deliveryMethod\", delivery_address AS \"deliveryAddress\", status, created_at AS \"createdAt\" FROM orders WHERE user_id = ? ORDER BY id DESC");
            $stmt->execute([$userId]);
            $orders = $stmt->fetchAll();
            foreach ($orders as &$o) {
                $o['id'] = (int)$o['id'];
                $o['totalPrice'] = (int)$o['totalPrice'];
                $o['totalCo2'] = (float)$o['totalCo2'];
            }
            
            echo json_encode($orders, JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Ошибка получения истории: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }
    exit();
}

// 10. Получение отзывов к конкретному товару (GET /api/reviews?productId=...)
if (strpos($request_uri, '/api/reviews') === 0 && $method === 'GET') {
    $productId = isset($_GET['productId']) ? $_GET['productId'] : '';
    
    if (empty($productId)) {
        $queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
        parse_str($queryString, $queryParams);
        $productId = isset($queryParams['productId']) ? $queryParams['productId'] : '';
    }

    if (empty($productId)) {
        http_response_code(400);
        echo json_encode(["error" => "Не указан идентификатор товара (productId) для загрузки отзывов"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            SELECT r.id, r.rating, r.text, r.created_at AS \"createdAt\", 
                   u.first_name AS \"firstName\", u.avatar 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = ? 
            ORDER BY r.id DESC
        ");
        $stmt->execute([$productId]);
        $reviews = $stmt->fetchAll();

        foreach ($reviews as &$r) {
            $r['id'] = (int)$r['id'];
            $r['rating'] = (int)$r['rating'];
        }

        echo json_encode($reviews, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка при получении отзывов из СУБД: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 11. Публикация нового отзыва (POST /api/reviews)
if ($request_uri === '/api/reviews' && $method === 'POST') {
    if (empty($input['productId']) || empty($input['userId']) || empty($input['rating']) || empty($input['text'])) {
        http_response_code(400);
        echo json_encode(["error" => "Все поля отзыва обязательны для заполнения"], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO reviews (product_id, user_id, rating, text) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $input['productId'], 
            (int)$input['userId'], 
            (int)$input['rating'], 
            trim($input['text'])
        ]);
        
        http_response_code(201);
        echo json_encode(["status" => "success"], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Не удалось сохранить отзыв в СУБД: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 12. Получение списка всех пользователей для админа (GET /api/admin/users)
if ($request_uri === '/api/admin/users' && $method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, email, first_name, last_name, role, shop_name FROM users ORDER BY id DESC");
        $rawUsers = $stmt->fetchAll();

        $formattedUsers = [];
        foreach ($rawUsers as $u) {
            $formattedUsers[] = [
                "id" => (int)$u['id'],
                "email" => $u['email'],
                "firstName" => $u['first_name'] ?? '',
                "lastName" => $u['last_name'] ?? '',
                "role" => $u['role'],
                "shopName" => $u['shop_name'] ?? ''
            ];
        }

        echo json_encode($formattedUsers, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Ошибка сервера модерации: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 13. Назначение роли продавца или клиента (POST /api/admin/update-role)
if ($request_uri === '/api/admin/update-role' && $method === 'POST') {
    if (empty($input['targetUserId']) || empty($input['role'])) {
        http_response_code(400);
        echo json_encode(["error" => "Недостаточно данных для изменения роли"], JSON_UNESCAPED_UNICODE);
        exit();
    }

    try {
        $shopName = !empty($input['shopName']) ? trim($input['shopName']) : null;
        
        $stmt = $pdo->prepare("UPDATE users SET role = ?, shop_name = ? WHERE id = ?");
        $stmt->execute([
            $input['role'],
            $shopName,
            (int)$input['targetUserId']
        ]);

        echo json_encode(["status" => "success"], JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Не удалось обновить роль: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

http_response_code(404);
echo json_encode(["error" => "Эндпоинт не найден"], JSON_UNESCAPED_UNICODE);