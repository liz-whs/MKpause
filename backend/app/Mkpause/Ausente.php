<?php

namespace App\Mkpause;

/** Marca um campo que não veio no corpo do pedido (diferente de null ou ""). */
enum Ausente
{
    case Campo;
}
