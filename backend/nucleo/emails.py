"""Fila durável: o sucesso do SMTP indica aceitação pelo servidor, não leitura ou entrega final."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.db import connections, transaction
from django.utils import timezone

log = logging.getLogger("mkpause")
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="mkpause-email")


def agendar_envio():
    if settings.EMAIL_ENVIO_AUTOMATICO:
        transaction.on_commit(lambda: executor.submit(_executar))


def _executar():
    try:
        processar_emails()
    except Exception as erro:
        # Não registra corpos de e-mail, tokens nem endereços pessoais.
        log.error("Falha ao processar fila de e-mail: %s", type(erro).__name__)
    finally:
        connections.close_all()


def mensagem(item):
    if item.convite_id:
        from acompanhamento.convites import link_convite
        c = item.convite
        if (c.status != "PENDENTE" or c.expira_em <= timezone.now() or not c.responsavel.ativo
                or not c.estudante.ativo or not c.estudante.usuario.ativo
                or c.responsavel.email != item.email_destino):
            return None
        return ("MKpause: convite para responsável",
                "A escola enviou um convite para confirmar sua responsabilidade e conhecer a autorização proposta.\n\n"
                f"Leia e responda pelo link: {link_convite(c)}\n\n"
                "O link é pessoal e vale por sete dias. Se não reconhecer o convite, não aceite. "
                "Nenhuma conta será criada para você.")
    d = item.destinatario_alerta
    # Confere o vínculo de novo antes de enviar uma notificação pendente.
    from contas.perfis import carregar_perfil
    from contas.permissoes import estudantes_vinculados
    if (d.alerta.status in ("CANCELADO", "RESOLVIDO") or not d.usuario.ativo
            or d.usuario.email != item.email_destino or not carregar_perfil(d.usuario)
            or not estudantes_vinculados(d.usuario).filter(pk=d.alerta.estudante_id).exists()):
        return None
    return ("MKpause: novo aviso para acompanhar",
            "Há um novo aviso no MKpause para você acompanhar. Entre com sua conta para consultar.\n\n"
            f"{settings.PUBLIC_BASE_URL}/entrar\n\n"
            "Este e-mail não substitui o acompanhamento presencial. Não contém dados emocionais do estudante.")


def processar_emails(limite=50):
    from acompanhamento.models import NotificacaoEmail
    from alertas.models import DestinatarioAlerta
    enviados = 0
    agora = timezone.now()
    # Recupera trabalho interrompido por reinício do processo. SMTP não oferece exactly-once.
    NotificacaoEmail.objects.filter(status="PROCESSANDO", processando_em__lt=agora - timedelta(minutes=5)).update(
        status="FALHA", disponivel_em=agora, erro="Processamento interrompido")
    for _ in range(limite):
        with transaction.atomic():
            item = (NotificacaoEmail.objects.select_for_update(skip_locked=True)
                    .filter(status__in=["PENDENTE", "FALHA"], tentativas__lt=5, disponivel_em__lte=timezone.now())
                    .order_by("criado_em", "pk").first())
            if item is None:
                break
            item.status, item.processando_em = "PROCESSANDO", timezone.now()
            item.tentativas += 1
            item.save(update_fields=["status", "processando_em", "tentativas"])
        try:
            conteudo = mensagem(item)
            if conteudo is None:
                NotificacaoEmail.objects.filter(pk=item.pk, status="PROCESSANDO").update(status="CANCELADA")
                continue
            assunto, corpo = conteudo
            if EmailMessage(assunto, corpo, settings.DEFAULT_FROM_EMAIL, [item.email_destino]).send() != 1:
                raise RuntimeError("Envio não confirmado")
        except Exception as erro:
            NotificacaoEmail.objects.filter(pk=item.pk, status="PROCESSANDO").update(
                status="FALHA", erro=type(erro).__name__, disponivel_em=timezone.now() + timedelta(minutes=5))
            if item.destinatario_alerta_id:
                DestinatarioAlerta.objects.filter(pk=item.destinatario_alerta_id).exclude(status_notificacao="LIDA").update(status_notificacao="FALHA")
            continue
        enviado = timezone.now()
        NotificacaoEmail.objects.filter(pk=item.pk, status="PROCESSANDO").update(status="ENVIADA", enviado_em=enviado, erro=None)
        if item.destinatario_alerta_id:
            DestinatarioAlerta.objects.filter(pk=item.destinatario_alerta_id).update(enviado_em=enviado)
            DestinatarioAlerta.objects.filter(pk=item.destinatario_alerta_id).exclude(status_notificacao="LIDA").update(status_notificacao="ENVIADA")
        enviados += 1
    return enviados
