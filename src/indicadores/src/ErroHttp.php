<?php
declare(strict_types=1);

namespace MKpause\Indicadores;

/** Erro com o código HTTP que o serviço deve devolver. */
final class ErroHttp extends \RuntimeException
{
    public function __construct(public readonly int $status, string $mensagem)
    {
        parent::__construct($mensagem);
    }
}
