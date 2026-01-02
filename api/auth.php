<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'forexterchat');
define('DB_USER', 'root');
define('DB_PASS', '');

// Google OAuth configuration
define('GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_CLIENT_ID');
define('GOOGLE_CLIENT_SECRET', 'YOUR_GOOGLE_CLIENT_SECRET');

// Admin users (in production, store in database)
$admin_users = ['ndii', 'fanks', 'lanyz', 'lez', 'karin', 'kenz'];

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Connect to database
function connectDB() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        return null;
    }
}

// Verify Google token
function verifyGoogleToken($token) {
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . $token;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    }
    
    return null;
}

// Generate JWT token
function generateToken($user) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ]);
    
    $base64Header = base64_encode($header);
    $base64Payload = base64_encode($payload);
    
    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", 'forexter_secret_key', true);
    $base64Signature = base64_encode($signature);
    
    return "$base64Header.$base64Payload.$base64Signature";
}

// Main router
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$endpoint = basename($path);

switch ($endpoint) {
    case 'login':
        handleLogin();
        break;
    case 'register':
        handleRegister();
        break;
    case 'verify-admin':
        handleAdminVerify();
        break;
    case 'check-session':
        handleCheckSession();
        break;
    default:
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}

function handleLogin() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['token'])) {
        echo json_encode(['error' => 'Token required']);
        return;
    }
    
    $token = $data['token'];
    $userInfo = verifyGoogleToken($token);
    
    if (!$userInfo) {
        echo json_encode(['error' => 'Invalid token']);
        return;
    }
    
    $pdo = connectDB();
    if (!$pdo) {
        echo json_encode(['error' => 'Database connection failed']);
        return;
    }
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$userInfo['email']]);
    $user = $stmt->fetch();
    
    // Check if user is admin
    $isAdmin = in_array(explode('@', $userInfo['email'])[0], $GLOBALS['admin_users']);
    
    if (!$user) {
        // User doesn't exist, require registration
        echo json_encode([
            'success' => false,
            'requires_registration' => true,
            'user_info' => [
                'email' => $userInfo['email'],
                'name' => $userInfo['name'],
                'picture' => $userInfo['picture']
            ]
        ]);
        return;
    }
    
    // Update last login
    $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    // Generate session token
    $sessionToken = generateToken([
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $isAdmin ? 'admin' : 'user'
    ]);
    
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'phone' => $user['phone'],
            'avatar' => $user['avatar'],
            'role' => $isAdmin ? 'admin' : 'user',
            'status' => $user['status']
        ],
        'token' => $sessionToken
    ]);
}

function handleRegister() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['name']) || !isset($data['phone'])) {
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $name = htmlspecialchars($data['name']);
    $phone = htmlspecialchars($data['phone']);
    $accountType = $data['account_type'] ?? 'personal';
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['error' => 'Invalid email']);
        return;
    }
    
    $pdo = connectDB();
    if (!$pdo) {
        echo json_encode(['error' => 'Database connection failed']);
        return;
    }
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        echo json_encode(['error' => 'Email already registered']);
        return;
    }
    
    // Check if phone already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    
    if ($stmt->fetch()) {
        echo json_encode(['error' => 'Phone number already registered']);
        return;
    }
    
    // Create user with pending status
    $userId = uniqid('user_');
    $avatar = "https://ui-avatars.com/api/?name=" . urlencode($name) . "&background=2563eb&color=fff&bold=true";
    
    $stmt = $pdo->prepare("INSERT INTO users (id, email, name, phone, avatar, account_type, status, created_at) 
                           VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())");
    $stmt->execute([$userId, $email, $name, $phone, $avatar, $accountType]);
    
    // Notify admins (in production, send email/WhatsApp notification)
    notifyAdmins($userId, $name, $phone);
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful. Account pending admin approval.',
        'user_id' => $userId
    ]);
}

function handleAdminVerify() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['admin_id']) || !isset($data['admin_key'])) {
        echo json_encode(['error' => 'Admin credentials required']);
        return;
    }
    
    $adminId = $data['admin_id'];
    $adminKey = $data['admin_key'];
    
    // Verify admin credentials (in production, use secure hashing)
    $validAdmins = [
        'ndii' => 'admin123',
        'fanks' => 'admin123',
        'lanyz' => 'admin123',
        'lez' => 'admin123',
        'karin' => 'admin123',
        'kenz' => 'admin123'
    ];
    
    if (!isset($validAdmins[$adminId]) || $validAdmins[$adminId] !== $adminKey) {
        echo json_encode(['error' => 'Invalid admin credentials']);
        return;
    }
    
    // Generate admin session
    $sessionToken = generateToken([
        'id' => 'admin_' . $adminId,
        'email' => $adminId . '@forexter.net',
        'role' => 'admin',
        'is_super_admin' => true
    ]);
    
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => 'admin_' . $adminId,
            'email' => $adminId . '@forexter.net',
            'name' => 'Admin ' . ucfirst($adminId),
            'role' => 'admin',
            'is_super_admin' => true
        ],
        'token' => $sessionToken
    ]);
}

function handleCheckSession() {
    $headers = getallheaders();
    
    if (!isset($headers['Authorization'])) {
        echo json_encode(['valid' => false]);
        return;
    }
    
    $authHeader = $headers['Authorization'];
    $token = str_replace('Bearer ', '', $authHeader);
    
    // Verify token (simplified - in production use proper JWT verification)
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        echo json_encode(['valid' => false]);
        return;
    }
    
    // In production, verify signature
    echo json_encode(['valid' => true]);
}

function notifyAdmins($userId, $userName, $userPhone) {
    // In production, implement actual notification system
    // For now, log to database
    
    $pdo = connectDB();
    if (!$pdo) return;
    
    $notification = [
        'type' => 'new_registration',
        'message' => "New user registration: $userName ($userPhone)",
        'data' => json_encode(['user_id' => $userId]),
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $stmt = $pdo->prepare("INSERT INTO admin_notifications (type, message, data, created_at) 
                           VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $notification['type'],
        $notification['message'],
        $notification['data'],
        $notification['created_at']
    ]);
}
?>
