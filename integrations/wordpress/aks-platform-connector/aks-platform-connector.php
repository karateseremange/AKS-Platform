<?php
/**
 * Plugin Name: AKS Platform Connector
 * Description: Passerelle sécurisée entre WordPress et AKS Platform.
 * Version: 0.10.1
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: Association Karaté Serémange
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

final class AKS_Platform_Connector
{
    private const REST_NAMESPACE = 'aks-platform/v1';
    private const MAX_BODY_BYTES = 100000;

    public static function boot(): void
    {
        add_action('rest_api_init', [self::class, 'register_routes']);
        add_shortcode('aks_health_questionnaire', [self::class, 'render_shortcode']);
    }

    public static function render_shortcode(): string
    {
        $base_url = plugin_dir_url(__FILE__);
        wp_enqueue_style(
            'aks-platform-questionnaire',
            $base_url . 'assets/questionnaire.css',
            [],
            '0.10.1'
        );
        wp_enqueue_script(
            'aks-platform-questionnaire',
            $base_url . 'assets/questionnaire.js',
            [],
            '0.10.1',
            true
        );
        wp_localize_script('aks-platform-questionnaire', 'AKSQuestionnaire', [
            'restUrl' => esc_url_raw(rest_url(self::REST_NAMESPACE . '/')),
            'nonce' => wp_create_nonce('wp_rest'),
        ]);

        return '<div class="aks-hq" data-aks-questionnaire>' .
            '<div class="aks-hq__loading" role="status">' .
            'Chargement du questionnaire…</div></div>';
    }

    public static function register_routes(): void
    {
        foreach (['context', 'prepare', 'submit'] as $action) {
            register_rest_route(self::REST_NAMESPACE, '/' . $action, [
                'methods' => 'POST',
                'callback' => static fn(WP_REST_Request $request) =>
                    self::proxy($action, $request),
                'permission_callback' => [self::class, 'authorize_browser_request'],
            ]);
        }
    }

    public static function authorize_browser_request(WP_REST_Request $request)
    {
        $nonce = $request->get_header('X-WP-Nonce');
        $origin = $request->get_header('Origin');
        $site_host = wp_parse_url(home_url('/'), PHP_URL_HOST);
        $origin_host = $origin ? wp_parse_url($origin, PHP_URL_HOST) : '';

        if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
            return new WP_Error(
                'aks_invalid_nonce',
                'La session du questionnaire a expiré.',
                ['status' => 403]
            );
        }
        if ($origin_host && !hash_equals((string) $site_host, (string) $origin_host)) {
            return new WP_Error(
                'aks_invalid_origin',
                'Origine de la requête refusée.',
                ['status' => 403]
            );
        }
        $route = $request->get_route();
        $limit = str_ends_with($route, '/submit') ? 10 : 60;
        $window = (int) floor(time() / 300);
        $client = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $secret = defined('AKS_PLATFORM_CONNECTOR_SECRET')
            ? (string) AKS_PLATFORM_CONNECTOR_SECRET
            : wp_salt('nonce');
        $rate_key = 'aks_rate_' . hash_hmac(
            'sha256',
            $client . '|' . $route . '|' . $window,
            $secret
        );
        $count = (int) get_transient($rate_key);
        if ($count >= $limit) {
            return new WP_Error(
                'aks_rate_limit_exceeded',
                'Trop de tentatives. Veuillez patienter quelques minutes.',
                ['status' => 429]
            );
        }
        set_transient($rate_key, $count + 1, 310);
        return true;
    }

    private static function proxy(string $action, WP_REST_Request $request)
    {
        $configuration = self::configuration();
        if (is_wp_error($configuration)) {
            return $configuration;
        }

        $raw_body = $request->get_body();
        if (strlen($raw_body) > self::MAX_BODY_BYTES) {
            return new WP_Error(
                'aks_request_too_large',
                'La requête est trop volumineuse.',
                ['status' => 413]
            );
        }

        $payload = json_decode($raw_body ?: '{}', true);
        if (!is_array($payload)) {
            return new WP_Error(
                'aks_invalid_json',
                'Le contenu transmis est invalide.',
                ['status' => 400]
            );
        }

        $payload_json = wp_json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );
        $timestamp = time();
        $nonce = self::base64url(random_bytes(24));
        $canonical = implode("\n", [
            '1',
            $action,
            (string) $timestamp,
            $nonce,
            self::base64url(hash('sha256', $payload_json, true)),
        ]);
        $envelope = [
            'version' => '1',
            'action' => $action,
            'timestamp' => $timestamp,
            'nonce' => $nonce,
            'payload' => $payload_json,
            'signature' => self::base64url(
                hash_hmac('sha256', $canonical, $configuration['secret'], true)
            ),
        ];

        $response = wp_remote_post($configuration['url'], [
            'timeout' => 45,
            'redirection' => 0,
            'headers' => ['Content-Type' => 'application/json; charset=utf-8'],
            'body' => wp_json_encode($envelope),
            'data_format' => 'body',
        ]);

        if (is_wp_error($response)) {
            return new WP_Error(
                'aks_upstream_unavailable',
                'Le questionnaire santé est temporairement indisponible.',
                ['status' => 502]
            );
        }

        $status = wp_remote_retrieve_response_code($response);
        if ($status >= 300 && $status < 400) {
            $location = wp_remote_retrieve_header($response, 'location');
            if (!self::is_allowed_google_redirect($location)) {
                return new WP_Error(
                    'aks_upstream_redirect_refused',
                    'Le questionnaire santé est temporairement indisponible.',
                    ['status' => 502]
                );
            }
            $response = wp_remote_get($location, [
                'timeout' => 45,
                'redirection' => 2,
            ]);
            if (is_wp_error($response)) {
                return new WP_Error(
                    'aks_upstream_unavailable',
                    'Le questionnaire santé est temporairement indisponible.',
                    ['status' => 502]
                );
            }
        }

        $decoded = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($decoded) || !array_key_exists('ok', $decoded)) {
            return new WP_Error(
                'aks_upstream_invalid',
                'Le questionnaire santé est temporairement indisponible.',
                ['status' => 502]
            );
        }

        return rest_ensure_response($decoded);
    }

    private static function configuration()
    {
        $url = defined('AKS_PLATFORM_API_URL')
            ? trim((string) AKS_PLATFORM_API_URL)
            : '';
        $secret = defined('AKS_PLATFORM_CONNECTOR_SECRET')
            ? (string) AKS_PLATFORM_CONNECTOR_SECRET
            : '';

        if (!$url || !wp_http_validate_url($url) || strlen($secret) < 32) {
            return new WP_Error(
                'aks_connector_not_configured',
                'Le connecteur AKS Platform n’est pas configuré.',
                ['status' => 503]
            );
        }
        if (parse_url($url, PHP_URL_SCHEME) !== 'https') {
            return new WP_Error(
                'aks_connector_insecure_url',
                'Le connecteur AKS Platform exige une URL HTTPS.',
                ['status' => 503]
            );
        }

        return ['url' => $url, 'secret' => $secret];
    }

    private static function base64url(string $binary): string
    {
        return rtrim(strtr(base64_encode($binary), '+/', '-_'), '=');
    }

    private static function is_allowed_google_redirect($url): bool
    {
        if (!is_string($url) || !$url || !wp_http_validate_url($url)) {
            return false;
        }
        $scheme = strtolower((string) wp_parse_url($url, PHP_URL_SCHEME));
        $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));

        return $scheme === 'https' && (
            $host === 'script.googleusercontent.com' ||
            str_ends_with($host, '.script.googleusercontent.com')
        );
    }
}

AKS_Platform_Connector::boot();
