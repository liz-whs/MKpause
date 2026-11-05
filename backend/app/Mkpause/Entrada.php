<?php

namespace App\Mkpause;

use Illuminate\Support\Facades\DB;

/**
 * Valida o corpo JSON com as mesmas regras e mensagens dos serializers do Django REST
 * Framework, para a interface continuar mostrando os mesmos textos.
 *
 * Uso:
 *   $e = new Entrada($dados);
 *   $nome = $e->texto('nome_completo', max: 150);
 *   $e->falharSeHouverErros();
 *
 * Cada campo para no primeiro erro (como no DRF). Com $parcial (PATCH), campos ausentes
 * não são obrigatórios. Um campo ausente e opcional devolve Entrada::AUSENTE.
 */
class Entrada
{
    public const AUSENTE = Ausente::Campo;

    private array $erros = [];

    public function __construct(private array $dados, private bool $parcial = false)
    {
    }

    /** Garante que o corpo é um objeto JSON (DRF: "Esperava um dicionário"). */
    public static function do(mixed $corpo, bool $parcial = false): self
    {
        if (!is_array($corpo) || ($corpo !== [] && array_is_list($corpo))) {
            $tipo = is_array($corpo) ? 'list' : (is_string($corpo) ? 'str' : (is_int($corpo) ? 'int' : 'str'));
            throw ErroApi::campos(['non_field_errors' => ["Dado inválido. Esperava um dicionário, mas recebeu {$tipo}."]]);
        }
        return new self($corpo, $parcial);
    }

    public function tem(string $campo): bool
    {
        return array_key_exists($campo, $this->dados);
    }

    public function bruto(string $campo, mixed $padrao = null): mixed
    {
        return $this->dados[$campo] ?? $padrao;
    }

    public function erro(string $campo, string $mensagem): void
    {
        $this->erros[$campo] ??= [$mensagem];
    }

    public function temErros(): bool
    {
        return $this->erros !== [];
    }

    public function falharSeHouverErros(): void
    {
        if ($this->erros) {
            throw ErroApi::campos($this->erros);
        }
    }

    /**
     * Começo comum a todos os campos: ausente, nulo.
     * Devolve [continuar?, valor].
     */
    private function inicio(string $campo, bool $obrigatorio, mixed $padrao, bool $nulo): array
    {
        if (!array_key_exists($campo, $this->dados)) {
            if ($this->parcial) {
                return [false, self::AUSENTE];
            }
            if ($padrao !== self::AUSENTE) {
                return [false, $padrao];
            }
            if ($obrigatorio) {
                $this->erro($campo, 'Este campo é obrigatório.');
            }
            return [false, self::AUSENTE];
        }
        $valor = $this->dados[$campo];
        if ($valor === null) {
            if (!$nulo) {
                $this->erro($campo, 'Este campo pode não ser nulo.');
            }
            return [false, null];
        }
        return [true, $valor];
    }

    public function texto(string $campo, ?int $max = null, ?int $min = null, bool $obrigatorio = true,
                          bool $vazio = false, bool $nulo = false, bool $aparar = true,
                          mixed $padrao = self::AUSENTE): mixed
    {
        [$seguir, $valor] = $this->inicio($campo, $obrigatorio, $padrao, $nulo);
        if (!$seguir) {
            return $valor;
        }
        if (is_bool($valor) || is_array($valor)) {
            $this->erro($campo, 'Não é uma string válida.');
            return null;
        }
        $valor = is_float($valor) ? rtrim(rtrim(number_format($valor, 10, '.', ''), '0'), '.') : (string) $valor;
        if ($aparar) {
            $valor = trim($valor);
        }
        if ($valor === '') {
            if (!$vazio) {
                $this->erro($campo, 'Este campo pode não estar em branco.');
            }
            return '';
        }
        if ($max !== null && mb_strlen($valor) > $max) {
            $this->erro($campo, "Certifique-se de que este campo não tenha mais de {$max} caracteres.");
            return null;
        }
        if ($min !== null && mb_strlen($valor) < $min) {
            $this->erro($campo, "Certifique-se de que este campo tenha mais de {$min} caracteres.");
            return null;
        }
        return $valor;
    }

    public function email(string $campo, int $max = 254, bool $obrigatorio = true, bool $vazio = false,
                          bool $nulo = false): mixed
    {
        $valor = $this->texto($campo, max: $max, obrigatorio: $obrigatorio, vazio: $vazio, nulo: $nulo);
        if (is_string($valor) && $valor !== '' && !self::emailValido($valor)) {
            $this->erros[$campo] = ['Insira um endereço de email válido.'];
            return null;
        }
        return $valor;
    }

    public function inteiro(string $campo, ?int $min = null, ?int $max = null, bool $obrigatorio = true,
                            bool $nulo = false, mixed $padrao = self::AUSENTE): mixed
    {
        [$seguir, $valor] = $this->inicio($campo, $obrigatorio, $padrao, $nulo);
        if (!$seguir) {
            return $valor;
        }
        $numero = self::paraInteiro($valor);
        if ($numero === null) {
            $this->erro($campo, 'Um número inteiro válido é exigido.');
            return null;
        }
        if ($max !== null && $numero > $max) {
            $this->erro($campo, "Certifique-se de que este valor seja inferior ou igual a {$max}.");
            return null;
        }
        if ($min !== null && $numero < $min) {
            $this->erro($campo, "Certifque-se de que este valor seja maior ou igual a {$min}.");
            return null;
        }
        return $numero;
    }

    /** $opcoes: valores aceitos (texto ou inteiro); compara como o DRF, pela forma em texto. */
    public function escolha(string $campo, array $opcoes, bool $obrigatorio = true, bool $nulo = false,
                            mixed $padrao = self::AUSENTE): mixed
    {
        [$seguir, $valor] = $this->inicio($campo, $obrigatorio, $padrao, $nulo);
        if (!$seguir) {
            return $valor;
        }
        $texto = is_bool($valor) ? ($valor ? 'True' : 'False') : (is_array($valor) ? json_encode($valor) : (string) $valor);
        foreach ($opcoes as $opcao) {
            if ((string) $opcao === $texto) {
                return $opcao;
            }
        }
        $this->erro($campo, "\"{$texto}\" não é uma escolha válida.");
        return null;
    }

    public function booleano(string $campo, bool $obrigatorio = true, bool $nulo = false,
                             mixed $padrao = self::AUSENTE): mixed
    {
        [$seguir, $valor] = $this->inicio($campo, $obrigatorio, $padrao, $nulo);
        if (!$seguir) {
            return $valor;
        }
        $verdade = [true, 1, '1', 'true', 'True', 'TRUE', 't', 'T', 'y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON'];
        $falso = [false, 0, '0', 'false', 'False', 'FALSE', 'f', 'F', 'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'];
        if (in_array($valor, $verdade, true)) {
            return true;
        }
        if (in_array($valor, $falso, true)) {
            return false;
        }
        $this->erro($campo, 'Deve ser um valor booleano válido.');
        return null;
    }

    /** Data AAAA-MM-DD (devolve o texto normalizado). */
    public function data(string $campo, bool $obrigatorio = true, bool $nulo = false): mixed
    {
        [$seguir, $valor] = $this->inicio($campo, $obrigatorio, self::AUSENTE, $nulo);
        if (!$seguir) {
            return $valor;
        }
        if (is_string($valor) && preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $valor, $m)
            && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
        }
        $this->erro($campo, 'Formato de data inválido. Use um dos formatos a seguir: YYYY-MM-DD.');
        return null;
    }

    /** ID de outra tabela (PrimaryKeyRelatedField). */
    public function referencia(string $campo, string $tabela, string $chave, bool $obrigatorio = true,
                               bool $nulo = false): mixed
    {
        [$seguir, $valor] = $this->inicio($campo, $obrigatorio, self::AUSENTE, $nulo);
        if (!$seguir) {
            return $valor;
        }
        if (is_bool($valor) || is_array($valor) || is_float($valor)) {
            $tipo = is_bool($valor) ? 'bool' : (is_array($valor) ? (array_is_list($valor) ? 'list' : 'dict') : 'float');
            $this->erro($campo, "Tipo incorreto. Esperava valor pk, recebeu {$tipo}.");
            return null;
        }
        $numero = self::paraInteiro($valor);
        if (is_string($valor) && $numero === null) {
            $this->erro($campo, 'Tipo incorreto. Esperava valor pk, recebeu str.');
            return null;
        }
        if ($numero === null || !DB::table($tabela)->where($chave, $numero)->exists()) {
            $this->erro($campo, "Pk inválido \"{$valor}\" - objeto não existe.");
            return null;
        }
        return $numero;
    }

    public static function paraInteiro(mixed $valor): ?int
    {
        if (is_int($valor)) {
            return $valor;
        }
        if (is_bool($valor)) {
            return (int) $valor;
        }
        if (is_float($valor)) {
            return floor($valor) == $valor ? (int) $valor : null;
        }
        if (is_string($valor) && strlen($valor) <= 1000) {
            // DRF aceita "5" e "5.0", mas não "5.5".
            $sem = preg_replace('/\.0*$/', '', trim($valor));
            return preg_match('/^[+-]?\d+$/', $sem) ? (int) $sem : null;
        }
        return null;
    }

    public static function emailValido(string $email): bool
    {
        return (bool) preg_match('/^[^@\s]+@[^@\s]+\.[^@\s]+$/u', $email)
            && filter_var(self::asciiDoDominio($email), FILTER_VALIDATE_EMAIL) !== false;
    }

    private static function asciiDoDominio(string $email): string
    {
        [$local, $dominio] = explode('@', $email, 2) + [1 => ''];
        if (function_exists('idn_to_ascii')) {
            $dominio = idn_to_ascii($dominio, 0, INTL_IDNA_VARIANT_UTS46) ?: $dominio;
        }
        return preg_replace('/[^\x20-\x7E]/', 'a', $local).'@'.$dominio;
    }
}
