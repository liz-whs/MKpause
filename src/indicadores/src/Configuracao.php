<?php
declare(strict_types=1);

namespace MKpause\Indicadores;

/**
 * Configuração do serviço, lida das variáveis de ambiente.
 * Em desenvolvimento, se as variáveis não existirem, lê backend/.env.
 *
 *   DATABASE_URL            postgres://usuario:senha@host:porta/banco   (ou DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
 *   MKPAUSE_API_URL         endereço da API para conferir a sessão (padrão http://127.0.0.1:8000)
 *   INDICADORES_TIMEZONE    fuso para agrupar por dia e hora (padrão America/Sao_Paulo)
 */
final class Configuracao
{
    /** @var array<string, string> */
    private array $valores;

    public function __construct(?string $arquivoEnv = null)
    {
        $this->valores = [];
        $padrao = $arquivoEnv === null;
        $arquivoEnv ??= dirname(__DIR__, 3) . '/backend/.env';
        if (is_file($arquivoEnv)) {
            $this->valores = self::lerEnv((string) file_get_contents($arquivoEnv));
        }
        $envRaiz = dirname(__DIR__, 3) . '/.env.local';
        if ($padrao && is_file($envRaiz)) {
            $this->valores += self::lerEnv((string) file_get_contents($envRaiz));
        }
    }

    public function get(string $nome, string $padrao = ''): string
    {
        $doAmbiente = getenv($nome);
        if ($doAmbiente !== false) {
            return $doAmbiente;
        }
        return $this->valores[$nome] ?? $padrao;
    }

    /** DSN do PDO e credenciais, a partir de DATABASE_URL ou de DB_*. */
    public function banco(): array
    {
        $url = $this->get('INDICADORES_DATABASE_URL', $this->get('DATABASE_URL'));
        if ($url !== '') {
            $p = parse_url($url);
            if ($p === false || !isset($p['host'])) {
                throw new \RuntimeException('DATABASE_URL inválida.');
            }
            parse_str($p['query'] ?? '', $query);
            $dsn = sprintf(
                'pgsql:host=%s;port=%d;dbname=%s',
                $p['host'],
                $p['port'] ?? 5432,
                ltrim($p['path'] ?? '/mkpause', '/'),
            );
            if (isset($query['sslmode'])) {
                $dsn .= ';sslmode=' . $query['sslmode'];
            }
            return [$dsn, rawurldecode($p['user'] ?? ''), rawurldecode($p['pass'] ?? '')];
        }
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            $this->get('DB_HOST', 'localhost'),
            $this->get('DB_PORT', '5432'),
            $this->get('DB_NAME', 'mkpause'),
        );
        return [$dsn, $this->get('DB_USER', 'postgres'), $this->get('DB_PASSWORD')];
    }

    public function apiInterna(): string
    {
        return rtrim($this->get('MKPAUSE_API_URL', 'http://127.0.0.1:8000'), '/');
    }

    public function fuso(): string
    {
        return $this->get('INDICADORES_TIMEZONE', 'America/Sao_Paulo');
    }

    /** @return array<string, string> */
    public static function lerEnv(string $texto): array
    {
        $valores = [];
        foreach (preg_split('/\R/', $texto) ?: [] as $linha) {
            $linha = trim($linha);
            if ($linha === '' || $linha[0] === '#' || !str_contains($linha, '=')) {
                continue;
            }
            [$chave, $valor] = explode('=', $linha, 2);
            $valores[trim($chave)] = trim(trim($valor), "\"'");
        }
        return $valores;
    }
}
