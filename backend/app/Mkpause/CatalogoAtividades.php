<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

class CatalogoAtividades
{
    public const ITENS = [
        ['respire & pause', 'RESPIRACAO', 'respiracao'],
        ['piano pause', 'JOGO', '/jogos/pianopause/index.html'],
        ['mk potion', 'JOGO', '/jogos/mkpotion/index.html'],
        ['mk connection', 'JOGO', '/jogos/mkconnection/index.html'],
        ['mk breath', 'VIDEO', 'video'],
        ['spiral pause', 'VIDEO', '/videos/espiral-celular.mp4'],
        ['chinchilla pause', 'VIDEO', '/videos/chinchila-celular.mp4'],
    ];

    /** Acrescenta atividades sem recriar contas ou alterar escolhas administrativas existentes. */
    public static function sincronizar(?int $escola = null): void
    {
        if ($escola === null) {
            foreach (DB::table('escola')->pluck('id_escola') as $id) self::sincronizar((int) $id);
            return;
        }
        DB::transaction(function () use ($escola) {
            $agora = Formato::banco(Formato::agora());
            foreach (self::ITENS as [$nome, $tipo, $ref]) {
                if (!DB::table('atividade')->where('id_escola', $escola)->where('tipo', $tipo)->where('conteudo_ou_referencia', $ref)->exists()) {
                    $pronta = !str_starts_with($ref, '/videos/') || is_file(base_path('../src/web/public'.$ref)) || is_file(config('mkpause.interface_web').$ref);
                    DB::table('atividade')->insert(['id_escola' => $escola, 'nome' => $nome, 'tipo' => $tipo, 'conteudo_ou_referencia' => $ref,
                        'disponivel' => $pronta, 'criado_em' => $agora, 'atualizado_em' => $agora]);
                }
                $antigos = match ($ref) {
                    'respiracao' => ['Respire&Pause', 'Respiração da chinchila', 'Chinchila respirando', 'Respiração'],
                    'video' => ['MK Breath', 'Vídeo: um minuto de calma', 'Respiração guiada em vídeo'],
                    '/jogos/pianopause/index.html' => ['PianoPause'],
                    '/jogos/mkpotion/index.html' => ['MK Potion'],
                    '/jogos/mkconnection/index.html' => ['MKconnection'],
                    '/videos/espiral-celular.mp4' => ['Respiração em espiral', 'Respiração com espiral'],
                    '/videos/chinchila-celular.mp4' => ['Respiração com a chinchila'],
                    default => [],
                };
                if ($antigos) DB::table('atividade')->where('id_escola', $escola)->where('tipo', $tipo)->where('conteudo_ou_referencia', $ref)
                    ->whereIn('nome', $antigos)->update(['nome' => $nome, 'atualizado_em' => $agora]);
            }
        });
    }
}
