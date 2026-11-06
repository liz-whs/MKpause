<?php

namespace App\Mkpause;

use RuntimeException;

/**
 * Erro da API no formato que a interface já conhece (o mesmo do Django REST Framework):
 * {"detail": "..."} ou erros por campo {"email": ["..."]}.
 */
class ErroApi extends RuntimeException
{
    public function __construct(public readonly int $status, public readonly array $corpo, array $cabecalhos = [])
    {
        parent::__construct(json_encode($corpo, JSON_UNESCAPED_UNICODE));
        $this->cabecalhos = $cabecalhos;
    }

    public array $cabecalhos;

    public static function detalhe(int $status, string $mensagem): self
    {
        return new self($status, ['detail' => $mensagem]);
    }

    public static function invalido(string $mensagem): self
    {
        return self::detalhe(400, $mensagem);
    }

    /** Erros por campo, ex.: ['email' => ['Já existe uma conta com este e-mail.']]. */
    public static function campos(array $erros): self
    {
        return new self(400, $erros);
    }

    public static function semLogin(): self
    {
        return new self(401, ['detail' => 'As credenciais de autenticação não foram fornecidas.'],
            ['WWW-Authenticate' => 'Session']);
    }

    public static function proibido(string $mensagem = 'Você não tem permissão para executar essa ação.'): self
    {
        return self::detalhe(403, $mensagem);
    }

    public static function naoEncontrado(string $mensagem = 'Não encontrado.'): self
    {
        return self::detalhe(404, $mensagem);
    }

    /** 404 de uma busca por ID, com a mensagem do Django: "No Atividade matches the given query." */
    public static function semRegistro(string $modelo): self
    {
        return self::naoEncontrado("No {$modelo} matches the given query.");
    }

    public static function conflito(string $mensagem): self
    {
        return self::detalhe(409, $mensagem);
    }
}
