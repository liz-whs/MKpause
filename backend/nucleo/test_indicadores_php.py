"""Integra PHP real, PostgreSQL temporário e autenticação HTTP do Django."""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener

from django.db import connection
from django.test import LiveServerTestCase, skipUnlessDBFeature, override_settings
from django.utils import timezone
from datetime import timedelta
from atividades.models import Atividade
from contas.models import Administrador, Estudante
from sessoes.models import Sessao, RegistroHumor
from alertas.models import Alerta
from nucleo.fabrica import criar_usuario
from contas.test_simulacoes_http import NavegadorHttp


@skipUnlessDBFeature('has_select_for_update')
@override_settings(SESSION_COOKIE_SECURE=False, CSRF_COOKIE_SECURE=False)
class IndicadoresPhpTestes(LiveServerTestCase):
    host = '127.0.0.1'

    @classmethod
    def setUpClass(cls):
        from unittest import SkipTest
        php = shutil.which('php')
        if not php:
            raise SkipTest('PHP não disponível; execute também npm run test:indicadores.')
        args = []
        if os.name == 'nt':
            ext = Path(php).parent / 'ext'
            if (ext / 'php_pdo_pgsql.dll').exists():
                args = ['-d', f'extension_dir={ext}', '-d', 'extension=pdo_pgsql']
        drivers = subprocess.check_output([php, *args, '-r', 'echo json_encode(PDO::getAvailableDrivers());'], text=True)
        if 'pgsql' not in json.loads(drivers):
            raise SkipTest('PHP sem pdo_pgsql.')
        super().setUpClass()
        try:
            banco = connection.settings_dict
            assert banco['HOST'] in ('localhost', '127.0.0.1', '::1')
            assert banco['NAME'].startswith('test_')
            usuario, senha = quote(banco['USER'], safe=''), quote(banco['PASSWORD'], safe='')
            cls.ambiente = {**os.environ, 'DJANGO_API': cls.live_server_url,
                'INDICADORES_DATABASE_URL': f"postgresql://{usuario}:{senha}@127.0.0.1:{banco['PORT'] or 5432}/{banco['NAME']}",
                'INDICADORES_TIMEZONE': 'America/Sao_Paulo'}
            cls.php_comando = [php, *args]
            cls.raiz = Path(__file__).resolve().parents[2] / 'src' / 'indicadores'
            with socket.socket() as porta:
                porta.bind(('127.0.0.1', 0)); numero = porta.getsockname()[1]
            cls.origem = f'http://127.0.0.1:{numero}'
            cls.processo = subprocess.Popen([*cls.php_comando, '-S', f'127.0.0.1:{numero}', '-t', str(cls.raiz / 'public'),
                str(cls.raiz / 'public/index.php')], env=cls.ambiente, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for _ in range(50):
                try:
                    with build_opener(ProxyHandler({})).open(cls.origem + '/indicadores/api/saude', timeout=1) as r:
                        assert r.status == 200
                        break
                except URLError:
                    time.sleep(.1)
            else:
                raise RuntimeError('PHP não ficou disponível.')
        except BaseException:
            if hasattr(cls, 'processo'):
                cls.processo.terminate(); cls.processo.wait(timeout=10)
            super().tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        cls.processo.terminate(); cls.processo.wait(timeout=10)
        super().tearDownClass()

    def setUp(self):
        self.admin = Administrador.objects.create(usuario=criar_usuario('Admin', 'admin@php.teste'))
        self.alunos = [Estudante.objects.create(usuario=criar_usuario(f'Aluno {i}', f'aluno{i}@php.teste'), turma='Turma A') for i in range(6)]
        self.atividade = Atividade.objects.create(nome='Respiração', tipo='RESPIRACAO')

    def cookie(self, usuario):
        cliente = NavegadorHttp(self.live_server_url)
        from nucleo.fabrica import SENHA
        status, _ = cliente.chamar('POST', 'auth/login/', {'email': usuario.email, 'senha': SENHA})
        self.assertEqual(status, 200)
        return '; '.join(f'{c.name}={c.value}' for c in cliente.cookies)

    def resumo(self, cookie='', dias=7, metodo='GET'):
        req = Request(f'{self.origem}/indicadores/api/resumo?dias={dias}', method=metodo, headers={'Cookie': cookie})
        try:
            resposta = build_opener(ProxyHandler({})).open(req, timeout=10)
        except HTTPError as e:
            resposta = e
        with resposta:
            return resposta.status, json.load(resposta)

    def sessao(self, aluno, atividade=None, status='CONCLUIDA'):
        s = Sessao.objects.create(estudante=aluno, atividade=atividade or self.atividade, status=status,
            iniciada_em=timezone.now()-timedelta(days=1), terminada_em=timezone.now()-timedelta(days=1))
        RegistroHumor.objects.create(sessao=s, estado=2, momento='PRE')
        RegistroHumor.objects.create(sessao=s, estado=4, momento='POS')
        return s

    def test_autorizacao_metodo_e_periodo(self):
        self.assertEqual(self.resumo()[0], 401)
        self.assertEqual(self.resumo(self.cookie(self.alunos[0].usuario))[0], 403)
        cookie = self.cookie(self.admin.usuario)
        self.assertEqual(self.resumo(cookie, 14)[0], 400)
        self.assertEqual(self.resumo(cookie, metodo='POST')[0], 405)

    def test_amostra_pequena_nao_expoe_contagens(self):
        for a in self.alunos[:4]: self.sessao(a)
        status, r = self.resumo(self.cookie(self.admin.usuario))
        self.assertEqual(status, 200)
        self.assertFalse(r['suficiente'])
        self.assertNotIn('totais', r)

    def test_contagens_humor_cancelamento_e_limites_do_periodo(self):
        for a in self.alunos[:5]: self.sessao(a)
        self.sessao(self.alunos[5], status='CANCELADA')
        fora = self.sessao(self.alunos[5])
        Sessao.objects.filter(pk=fora.pk).update(iniciada_em=timezone.now()+timedelta(days=1))
        status, r = self.resumo(self.cookie(self.admin.usuario))
        self.assertEqual(status, 200)
        self.assertEqual(r['totais']['pausas'], 5)
        self.assertEqual(r['totais']['estudantes'], 5)
        self.assertEqual(r['humor']['melhor'], 100)
        self.assertEqual(sum(d['pausas'] for d in r['pausas_por_dia']), 5)
        self.assertNotIn('aluno0@php.teste', json.dumps(r))

    def test_mesmos_tres_alunos_em_duas_atividades_nao_viram_seis(self):
        for a in self.alunos[:5]: self.sessao(a)
        for nome in ['A', 'B']:
            atividade = Atividade.objects.create(nome=nome, tipo='JOGO')
            for a in self.alunos[:3]: self.sessao(a, atividade)
        status, r = self.resumo(self.cookie(self.admin.usuario))
        self.assertEqual(status, 200)
        self.assertEqual(r['atividades'], [])
        self.assertTrue(r['ocultos']['atividades'])

    def test_niveis_pequenos_sao_protegidos_em_conjunto(self):
        for a in self.alunos[:5]:
            self.sessao(a)
            Alerta.objects.create(estudante=a, nivel=3, criado_em=timezone.now()-timedelta(days=1))
        Alerta.objects.create(estudante=self.alunos[0], nivel=2, criado_em=timezone.now()-timedelta(days=1))
        status, r = self.resumo(self.cookie(self.admin.usuario))
        self.assertEqual(status, 200)
        self.assertIsNone(r['totais']['avisos_de_saida'])
        self.assertIsNone(r['totais']['alertas_nivel_3'])

    def test_conexao_recusa_escrita(self):
        codigo = '<?php require "'+str(self.raiz/'src/Configuracao.php').replace('\\','/')+'"; require "'+str(self.raiz/'src/Banco.php').replace('\\','/')+'"; '
        codigo += '$p=\\MKpause\\Indicadores\\Banco::conectar(new \\MKpause\\Indicadores\\Configuracao()); try {$p->exec("UPDATE atividade SET disponivel=disponivel WHERE false");exit(1);}catch(PDOException $e){exit($e->getCode()==="25006"?0:2);}'
        r = subprocess.run(self.php_comando, input=codigo, text=True, env=self.ambiente, capture_output=True, timeout=10)
        self.assertEqual(r.returncode, 0)

    def test_dias_e_horas_com_participantes_isolados_sao_ocultos(self):
        instante=timezone.localtime().replace(hour=12,minute=0,second=0,microsecond=0)-timedelta(days=1)
        for a in self.alunos[:5]:
            sessao=self.sessao(a)
            Sessao.objects.filter(pk=sessao.pk).update(iniciada_em=instante)
        Sessao.objects.filter(pk=sessao.pk).update(iniciada_em=instante-timedelta(days=1,hours=1))
        status,r=self.resumo(self.cookie(self.admin.usuario))
        self.assertEqual(status,200)
        self.assertEqual(r['pausas_por_dia'],[])
        self.assertEqual(r['pausas_por_hora'],[])
        self.assertTrue(r['ocultos']['dias'])
        self.assertTrue(r['ocultos']['horas'])

    def test_resultado_de_humor_pequeno_oculta_todas_as_porcentagens(self):
        for a in self.alunos[:5]: sessao=self.sessao(a)
        RegistroHumor.objects.filter(sessao=sessao,momento='POS').update(estado=2)
        status,r=self.resumo(self.cookie(self.admin.usuario))
        self.assertEqual(status,200)
        self.assertIsNone(r['humor'])
        self.assertTrue(r['ocultos']['humor'])
