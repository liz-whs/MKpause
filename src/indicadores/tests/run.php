<?php
declare(strict_types=1);
use MKpause\Indicadores\{Anonimizacao, Autorizacao, Configuracao, ErroHttp};
foreach (['Anonimizacao','Configuracao','ErroHttp','Autorizacao'] as $classe) require __DIR__."/../src/$classe.php";
$n=0;
function conferir(bool $valor,string $rotulo): void { global $n; $n++; if (!$valor) throw new RuntimeException("Falhou: $rotulo"); }
$mesmasPessoas=[['rotulo'=>'A','pausas'=>3,'estudantes'=>3],['rotulo'=>'B','pausas'=>3,'estudantes'=>3]];
conferir(Anonimizacao::proteger($mesmasPessoas)===['grupos'=>[],'ocultos'=>true], 'não somar participantes de atividades');
$grupos=[['rotulo'=>'A','pausas'=>20,'estudantes'=>5],['rotulo'=>'B','pausas'=>1,'estudantes'=>1]];
conferir(Anonimizacao::proteger($grupos)['grupos']===[], 'supressão complementar');
conferir(Anonimizacao::proteger([['rotulo'=>'A','pausas'=>5,'estudantes'=>5]])['grupos']===[['rotulo'=>'A','pausas'=>5]], 'limite de cinco');
conferir(!Anonimizacao::proteger([])['ocultos'], 'distribuição vazia');
conferir(Anonimizacao::porcentagens([1,1,1])===[34,33,33], 'arredondamento soma 100');
conferir(Anonimizacao::porcentagens([0,0,0])===[0,0,0], 'sem divisão por zero');
conferir(Configuracao::lerEnv("# comentario\nA='teste'\nB=valor=com=igual\n")==['A'=>'teste','B'=>'valor=com=igual'], 'leitura de env');
$config=new Configuracao(__DIR__.'/nao-existe.env');
foreach ([[401,'{}',401],[200,'{"perfil":"estudante"}',403],[200,'invalido',403],[500,'{}',502]] as [$status,$json,$esperado]) {
    try { (new Autorizacao($config,fn()=>[$status,$json]))->exigirAdministrador('sessionid=teste'); throw new RuntimeException('Deveria recusar'); }
    catch (ErroHttp $e) { conferir($e->status===$esperado, 'permissão por sessão'); }
}
try { (new Autorizacao($config,fn()=>throw new RuntimeException('Não deve consultar sem cookie')))->exigirAdministrador(''); }
catch (ErroHttp $e) { conferir($e->status===401, 'anônimo recusado antes da consulta'); }
conferir((new Autorizacao($config,fn()=>[200,'{"perfil":"administrador","id_usuario":1}']))->exigirAdministrador('sessionid=teste')['id_usuario']===1, 'administrador autorizado');
echo "$n verificações PHP passaram.\n";
