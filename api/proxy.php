<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function fetchUrl($url) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: es-ES,es;q=0.9',
            'Referer: https://vibuxer.com/'
        ]
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return $response;
}

function extractStreamUrl($html) {
    // Patrones comunes de reproductores de video
    $patterns = [
        '/file:\s*["\']([^"\']+(?:\.m3u8|\.mp4)[^"\']*)["\']/i',
        '/"file"\s*:\s*["\']([^"\']+(?:\.m3u8|\.mp4)[^"\']*)["\']/i',
        '/source\s+src=["\']([^"\']+(?:\.m3u8|\.mp4)[^"\']*)["\']/i',
        '/(https?:\/\/[^\s"\'<>]+\.m3u8[^\s"\'<>]*)/i',
        '/(https?:\/\/[^\s"\'<>]+\.mp4[^\s"\'<>]*)/i',
        '/setup\s*\(\s*\{[^}]*file\s*:\s*["\']([^"\']+)["\']/i'
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            $url = html_entity_decode($matches[1]);
            
            // Normalizar URL
            if (strpos($url, '//') === 0) {
                $url = 'https:' . $url;
            }
            
            return $url;
        }
    }
    
    // Buscar iframes
    if (preg_match('/<iframe[^>]+src=["\']([^"\']+)["\']/i', $html, $matches)) {
        $iframeUrl = $matches[1];
        if (strpos($iframeUrl, '//') === 0) {
            $iframeUrl = 'https:' . $iframeUrl;
        }
        
        $iframeHtml = fetchUrl($iframeUrl);
        return extractStreamUrl($iframeHtml);
    }
    
    return null;
}

// Procesar solicitud
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['url'])) {
        $html = fetchUrl($input['url']);
        
        if ($html) {
            $streamUrl = extractStreamUrl($html);
            
            if ($streamUrl) {
                echo json_encode([
                    'success' => true,
                    'streamUrl' => $streamUrl
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'No se encontró stream de video'
                ]);
            }
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'No se pudo acceder a la página'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'URL no proporcionada'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Método no permitido'
    ]);
}
?>
