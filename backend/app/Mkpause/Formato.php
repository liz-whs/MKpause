<?php

namespace App\Mkpause;

use Carbon\CarbonImmutable;
use DateTimeInterface;

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

    public static function local(DateTimeInterface|string|null $valor): ?string
    {
        $d = self::instante($valor);
        return $d ? self::iso($d->setTimezone(self::FUSO)) : null;
    }

    public static function utc(DateTimeInterface|string|null $valor): ?string
    {
        $d = self::instante($valor);
        if ($d === null) {
            return null;
        }
        return substr(self::iso($d->setTimezone('UTC')), 0, -6).'Z';
    }

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
