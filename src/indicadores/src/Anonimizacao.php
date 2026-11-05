<?php
declare(strict_types=1);
namespace MKpause\Indicadores;

/** Supressão de grupos pequenos; não equivale a garantia formal de anonimato. */
final class Anonimizacao
{
    public const MINIMO = 5;

    /** Oculta toda a distribuição para não revelar grupos pequenos por subtração. */
    public static function proteger(array $grupos, int $minimo = self::MINIMO): array
    {
        foreach ($grupos as $g) {
            if ($g['pausas'] > 0 && $g['estudantes'] < $minimo) return ['grupos'=>[], 'ocultos'=>true];
        }
        return ['grupos'=>array_map(fn($g)=>['rotulo'=>(string)$g['rotulo'], 'pausas'=>(int)$g['pausas']], $grupos), 'ocultos'=>false];
    }

    public static function porcentagens(array $valores): array
    {
        $total=array_sum($valores);
        if ($total === 0) return array_fill(0, count($valores), 0);
        $brutos=array_map(fn($v)=>$v*100/$total, $valores);
        $inteiros=array_map(fn($v)=>(int)floor($v), $brutos);
        $restos=[];
        foreach ($brutos as $i=>$v) $restos[$i]=$v-$inteiros[$i];
        arsort($restos);
        $falta=100-array_sum($inteiros);
        foreach (array_keys($restos) as $i) { if ($falta-- <= 0) break; $inteiros[$i]++; }
        return $inteiros;
    }
}
