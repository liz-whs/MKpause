"""Indicadores descritivos para o painel do psicólogo clínico.

Não realiza diagnóstico. Não persiste agregados: lê as sessões existentes.
"""
from collections import Counter
from datetime import datetime, time, timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from contas import perfis as p
from contas.models import Estudante
from contas.permissoes import pode, somente
from sessoes.models import RegistroHumor, Sessao


class FiltroPeriodo(serializers.Serializer):
    dias = serializers.ChoiceField(
        choices=[("7", "7"), ("14", "14"), ("30", "30"), ("90", "90")],
        default="14",
    )


class DashboardClinicoView(APIView):
    """GET /api/estudantes/<id_estudante>/dashboard/?dias=14"""

    permission_classes = [somente(p.PSICOLOGO_CLINICO)]

    def get(self, request, id_estudante):
        filtro = FiltroPeriodo(data=request.query_params)
        filtro.is_valid(raise_exception=True)
        dias = int(filtro.validated_data["dias"])

        estudante = get_object_or_404(Estudante, pk=id_estudante)
        if not pode(request.user, "ver_historico", estudante):
            raise PermissionDenied("Você não acompanha este estudante.")

        hoje = timezone.localdate()
        inicio = hoje - timedelta(days=dias - 1)
        # Limites de data no fuso do projeto, sem incluir dados de amanhã.
        comeco = timezone.make_aware(datetime.combine(inicio, time.min), timezone.get_current_timezone())
        fim = timezone.make_aware(datetime.combine(hoje + timedelta(days=1), time.min),
                                  timezone.get_current_timezone())
        sessoes = (Sessao.objects
                   .filter(estudante=estudante, status=Sessao.Status.CONCLUIDA,
                           iniciada_em__gte=comeco, iniciada_em__lt=fim)
                   .select_related("atividade")
                   .prefetch_related("registros_humor")
                   .order_by("iniciada_em", "id_sessao"))

        distribuicao_antes = Counter()
        distribuicao_depois = Counter()
        atividades = Counter()
        evolucao = []
        aumentou = manteve = diminuiu = 0

        for sessao in sessoes:
            humores = {r.momento: r.estado for r in sessao.registros_humor.all()
                       if r.momento in (RegistroHumor.Momento.PRE, RegistroHumor.Momento.POS)
                       and 1 <= r.estado <= 5}
            if len(humores) != 2:
                continue  # Não usar sessão com registro incompleto.
            antes = humores[RegistroHumor.Momento.PRE]
            depois = humores[RegistroHumor.Momento.POS]
            distribuicao_antes[antes] += 1
            distribuicao_depois[depois] += 1
            atividades[sessao.atividade.tipo] += 1
            aumentou += depois > antes
            manteve += depois == antes
            diminuiu += depois < antes
            evolucao.append({
                "id_sessao": sessao.pk,
                "data": timezone.localtime(sessao.iniciada_em).date().isoformat(),
                "iniciada_em": sessao.iniciada_em.isoformat(),
                "humor_antes": antes,
                "humor_depois": depois,
            })

        total = len(evolucao)
        return Response({
            "estudante": {"id_estudante": estudante.pk, "nome": estudante.usuario.nome_completo},
            "periodo": {"dias": dias, "inicio": inicio.isoformat(), "fim": hoje.isoformat()},
            "resumo": {
                "sessoes_concluidas": total,
                "humor_aumentou": aumentou,
                "humor_manteve": manteve,
                "humor_diminuiu": diminuiu,
                "percentual_aumento": round(aumentou * 100 / total, 1) if total else None,
            },
            "evolucao": evolucao,
            "distribuicao_humor": [
                {"estado": estado, "antes": distribuicao_antes[estado], "depois": distribuicao_depois[estado]}
                for estado in range(1, 6)
            ],
            "atividades": [
                {"tipo": tipo, "quantidade": atividades[tipo]}
                for tipo in ("RESPIRACAO", "JOGO", "VIDEO")
            ],
            "aviso": "Indicadores descritivos de autorrelato; não constituem diagnóstico.",
        })
