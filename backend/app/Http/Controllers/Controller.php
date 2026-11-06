<?php

namespace App\Http\Controllers;

use App\Mkpause\Conta;
use App\Mkpause\Entrada;
use App\Mkpause\ErroApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

abstract class Controller
{
    protected function conta(Request $request): Conta
    {
        return $request->attributes->get('conta');
    }

    protected function corpo(Request $request): mixed
    {
        $bruto = $request->getContent();
        if ($bruto === '') {
            return [];
        }
        $tipo = strtolower(trim(explode(';', (string) $request->headers->get('Content-Type', ''))[0]));
        if ($tipo !== 'application/json') {
            throw ErroApi::detalhe(415, "Tipo de mídia \"{$request->headers->get('Content-Type')}\" não é suportado.");
        }
        $dados = json_decode($bruto, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw ErroApi::invalido('JSON parse error - '.json_last_error_msg());
        }
        return $dados;
    }

    protected function entrada(Request $request, bool $parcial = false): Entrada
    {
        return Entrada::do($this->corpo($request), $parcial);
    }

    protected function json(mixed $dados, int $status = 200): JsonResponse
    {
        return response()->json($dados, $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    protected function vazio(): Response
    {
        return response()->noContent();
    }

    protected static function id(mixed $valor): int
    {
        if (!is_numeric($valor) || (string) (int) $valor !== (string) $valor) {
            throw ErroApi::naoEncontrado();
        }
        return (int) $valor;
    }
}
