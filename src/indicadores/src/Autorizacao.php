<?php
declare(strict_types=1);

namespace MKpause\Indicadores;

/**
 * Quem pode ver os indicadores: só o administrador.
 *
 * O PHP não tem login próprio. Ele repassa o cookie de sessão do navegador ao Django
 * (GET /api/auth/eu/) e confia na resposta: assim vale a mesma conta, a mesma
 * expiração e o mesmo "Sair" do resto do MKpause.
 */
final class Autorizacao
{
    public const PERFIS_PERMITIDOS = ['administrador'];

    /** @var callable(string, string): array{0:int,1:string} */
    private $buscar;

    public function __construct(private Configuracao $config, ?callable $buscar = null)
    {
        $this->buscar = $buscar ?? [self::class, 'buscarHttp'];
    }

    /**
     * Devolve a conta logada (como o Django descreve) ou lança ErroHttp 401/403.
     * @return array<string, mixed>
     */
    public function exigirAdministrador(string $cookie): array
    {
        if (trim($cookie) === '' || strlen($cookie) > 8192 || preg_match('/[\r\n]/', $cookie)) {
            throw new ErroHttp(401, 'Entre com sua conta para continuar.');
        }
        [$status, $corpo] = ($this->buscar)($this->config->djangoApi() . '/api/auth/eu/', $cookie);
        if ($status === 401 || $status === 403) {
            throw new ErroHttp(401, 'Entre com sua conta para continuar.');
        }
        if ($status !== 200) {
            throw new ErroHttp(502, 'Não foi possível conferir a sua sessão agora.');
        }
        $conta = json_decode($corpo, true);
        if (!is_array($conta) || !in_array($conta['perfil'] ?? null, self::PERFIS_PERMITIDOS, true)) {
            throw new ErroHttp(403, 'Só a administração da escola vê os indicadores.');
        }
        return $conta;
    }

    /** @return array{0:int,1:string} */
    public static function buscarHttp(string $url, string $cookie): array
    {
        $contexto = stream_context_create(['http' => [
            'method' => 'GET',
            'header' => "Cookie: {$cookie}\r\nAccept: application/json\r\n",
            'timeout' => 5,
            'ignore_errors' => true,
            'follow_location' => 0,
        ]]);
        $corpo = @file_get_contents($url, false, $contexto);
        $status = 0;
        foreach ($http_response_header ?? [] as $linha) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $linha, $m)) {
                $status = (int) $m[1];
            }
        }
        return [$status, $corpo === false ? '' : $corpo];
    }
}
