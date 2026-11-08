<?php
declare(strict_types=1);
namespace MKpause\Indicadores;
use PDO;

/** Agregados sem nomes/identificadores, com supressão independente por distribuição. */
final class Indicadores
{
    public const PERIODOS=[7,30,90];
    public function __construct(private PDO $pdo, private string $fuso, private int $escola) {}

    public function resumo(int $dias, ?\DateTimeImmutable $agora=null): array
    {
        if (!in_array($dias, self::PERIODOS, true)) throw new ErroHttp(400, 'Período inválido: use 7, 30 ou 90 dias.');
        $tz=new \DateTimeZone($this->fuso);
        $agora=($agora ?? new \DateTimeImmutable('now',$tz))->setTimezone($tz);
        $limite=$agora->setTime(0,0);
        $inicio=$limite->modify("-$dias days");
        $p=['escola'=>$this->escola,'inicio'=>$inicio->format(DATE_ATOM),'fim'=>$limite->format(DATE_ATOM)];
        $base=['periodo'=>['dias'=>$dias,'inicio'=>$inicio->format('Y-m-d'),'fim'=>$limite->modify('-1 day')->format('Y-m-d')], 'minimo_estudantes'=>Anonimizacao::MINIMO];
        $filtro="s.id_estudante IN (SELECT e.id_estudante FROM estudante e JOIN usuario u ON u.id_usuario=e.id_usuario WHERE u.id_escola=:escola) AND s.status <> 'CANCELADA' AND s.iniciada_em >= :inicio AND s.iniciada_em < :fim";
        $this->pdo->beginTransaction();
        try {
            $this->pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
            $totais=$this->consultar("SELECT COUNT(*) AS pausas, COUNT(DISTINCT s.id_estudante) AS estudantes FROM sessao s WHERE $filtro",$p)[0];
            if ((int)$totais['estudantes'] < Anonimizacao::MINIMO) return $base+['suficiente'=>false];
            $grupos=function(string $de,string $rotulo,string $condicao='',array $extra=[]) use($filtro,$p): array {
                return $this->consultar("SELECT $rotulo AS rotulo, COUNT(*) AS pausas, COUNT(DISTINCT s.id_estudante) AS estudantes
                    FROM sessao s $de WHERE $filtro $condicao GROUP BY 1 ORDER BY 1",$p+$extra);
            };
            $atividades=Anonimizacao::proteger($grupos('JOIN atividade a ON a.id_atividade=s.id_atividade','a.nome'));
            $turmas=Anonimizacao::proteger($grupos('JOIN estudante e ON e.id_estudante=s.id_estudante',"COALESCE(NULLIF(TRIM(e.turma),''),'Sem turma')"));
            $diasGrupo=Anonimizacao::proteger($grupos('',"to_char(s.iniciada_em AT TIME ZONE :fuso,'YYYY-MM-DD')",'',['fuso'=>$this->fuso]));
            $horas=Anonimizacao::proteger($grupos('','EXTRACT(HOUR FROM s.iniciada_em AT TIME ZONE :fuso)::int','',['fuso'=>$this->fuso]));
            $humor=Anonimizacao::proteger($grupos("JOIN registro_humor pre ON pre.id_sessao=s.id_sessao AND pre.momento='PRE'
                JOIN registro_humor pos ON pos.id_sessao=s.id_sessao AND pos.momento='POS'",
                "CASE WHEN pos.estado>pre.estado THEN 'melhor' WHEN pos.estado=pre.estado THEN 'igual' ELSE 'pior' END","AND s.status='CONCLUIDA' AND pre.estado BETWEEN 1 AND 5 AND pos.estado BETWEEN 1 AND 5"));
            $niveis=Anonimizacao::proteger($this->consultar("SELECT nivel AS rotulo,COUNT(*) AS pausas,COUNT(DISTINCT id_estudante) AS estudantes
                FROM alerta WHERE id_estudante IN (SELECT e.id_estudante FROM estudante e JOIN usuario u ON u.id_usuario=e.id_usuario WHERE u.id_escola=:escola) AND status <> 'CANCELADO' AND criado_em>=:inicio AND criado_em<:fim GROUP BY nivel ORDER BY nivel",$p));
            $porDia=[];
            if (!$diasGrupo['ocultos']) {
                $contagens=array_column($diasGrupo['grupos'],'pausas','rotulo');
                for($d=$inicio;$d<$limite;$d=$d->modify('+1 day')) {
                    $chave=$d->format('Y-m-d'); $porDia[]=['dia'=>$chave,'pausas'=>$contagens[$chave]??0];
                }
            }
            $h=null;
            if (!$humor['ocultos'] && count($humor['grupos'])>0) {
                $v=array_column($humor['grupos'],'pausas','rotulo');
                $contagens=[$v['melhor']??0,$v['igual']??0,$v['pior']??0];
                [$melhor,$igual,$pior]=Anonimizacao::porcentagens($contagens);
                $h=['melhor'=>$melhor,'igual'=>$igual,'pior'=>$pior,'sessoes'=>array_sum($contagens)];
            }
            $n=array_column($niveis['grupos'],'pausas','rotulo');
            return $base+['suficiente'=>true,'totais'=>['pausas'=>(int)$totais['pausas'],'estudantes'=>(int)$totais['estudantes'],
                'avisos_de_saida'=>$niveis['ocultos']?null:($n[2]??0),'alertas_nivel_3'=>$niveis['ocultos']?null:($n[3]??0)],
                'pausas_por_dia'=>$porDia,'pausas_por_hora'=>array_map(fn($g)=>['hora'=>(int)$g['rotulo'],'pausas'=>$g['pausas']],$horas['grupos']),
                'humor'=>$h,'atividades'=>$atividades['grupos'],'turmas'=>$turmas['grupos'],
                'ocultos'=>['dias'=>$diasGrupo['ocultos'],'horas'=>$horas['ocultos'],'humor'=>$humor['ocultos'],'niveis'=>$niveis['ocultos'],
                            'atividades'=>$atividades['ocultos'],'turmas'=>$turmas['ocultos']]];
        } finally { if ($this->pdo->inTransaction()) $this->pdo->rollBack(); }
    }

    private function consultar(string $sql,array $parametros): array
    {
        $st=$this->pdo->prepare($sql); $st->execute($parametros); return $st->fetchAll();
    }
}
