<?php

namespace App\Mkpause;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class Limite
{
    private const JANELA = 60;

    public static function exigir(Request $request, string $escopo): void
    {
        $conta = $request->attributes->get('conta');
        $quem = $escopo === 'vinculo' && $conta ? 'u'.$conta->id() : self::ip($request);
        $chave = "mkpause:limite:{$escopo}:{$quem}";
        $maximo = config("mkpause.limites.{$escopo}");

        Cache::lock("{$chave}:trava", 5)->block(5, function () use ($chave, $maximo) {
            $agora = microtime(true);
            $historico = array_values(array_filter(Cache::get($chave, []), fn ($t) => $t > $agora - self::JANELA));
            if (count($historico) >= $maximo) {
                $restante = self::JANELA - ($agora - end($historico));
                $espera = (int) ceil($restante / ($maximo - count($historico) + 1));
                throw new ErroApi(429, ['detail' => "Pedido foi suprimido. Espera-se que esteja diponível em {$espera} segundos."],
                    ['Retry-After' => (string) $espera]);
            }
            array_unshift($historico, $agora);
            Cache::put($chave, $historico, self::JANELA);
        });
    }

    private static function ip(Request $request): string
    {
        $encaminhado = $request->headers->get('X-Forwarded-For');
        return $encaminhado ? preg_replace('/\s+/', '', $encaminhado) : (string) $request->server('REMOTE_ADDR');
    }
}
