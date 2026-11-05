<?php

namespace App\Mkpause;

use Carbon\CarbonImmutable;
use DateTimeInterface;

/**
 * Datas no mesmo formato do backend Django anterior.
 *
 * O Django tinha dois caminhos, e a interface recebe os dois:
 *  - campos de serializer: horário de Brasília, ex. 2026-11-05T11:02:48.640204-03:00
 *  - valores devolvidos direto (códigos, convites): UTC com "Z", ex. 2026-11-05T14:02:48.640204Z
 * Em ambos os microssegundos só aparecem quando não são zero (como o isoformat do Python).
 */
class Formato
{
    public const FUSO = 'America/Sao_Paulo';

    public static function instante(DateTimeInterface|string|null $valor): ?CarbonImmutable
    {
        if ($valor === null || $valor === '') {
            return null;
        }
        return $valor instanceof DateTimeInterface
            ? CarbonImmutable::instance($valor)
            : CarbonImmutable::parse($valor, 'UTC');
    }

    /** Campo de serializer: horário de Brasília com o deslocamento (-03:00). */
    public static function local(DateTimeInterface|string|null $valor): ?string
    {
        $d = self::instante($valor);
        return $d ? self::iso($d->setTimezone(self::FUSO)) : null;
    }

    /** Valor devolvido direto: UTC terminado em Z. */
    public static function utc(DateTimeInterface|string|null $valor): ?string
    {
        $d = self::instante($valor);
        if ($d === null) {
            return null;
        }
        return substr(self::iso($d->setTimezone('UTC')), 0, -6).'Z';
    }

    /** Como datetime.isoformat() do Python, com "+00:00" (usado no dashboard clínico). */
    public static function isoUtc(DateTimeInterface|string|null $valor): ?string
    {
        $d = self::instante($valor);
        return $d ? self::iso($d->setTimezone('UTC')) : null;
    }

    public static function data(DateTimeInterface|string|null $valor): ?string
    {
        if ($valor === null || $valor === '') {
            return null;
        }
        return $valor instanceof DateTimeInterface ? $valor->format('Y-m-d') : substr((string) $valor, 0, 10);
    }

    /** Para gravar timestamptz sem perder microssegundos nem o fuso. */
    public static function banco(DateTimeInterface $d): string
    {
        return CarbonImmutable::instance($d)->setTimezone('UTC')->format('Y-m-d H:i:s.uP');
    }

    public static function agora(): CarbonImmutable
    {
        return CarbonImmutable::now('UTC');
    }

    private static function iso(CarbonImmutable $d): string
    {
        $micro = (int) $d->format('u');
        return $d->format('Y-m-d\TH:i:s').($micro ? '.'.$d->format('u') : '').$d->format('P');
    }
}
