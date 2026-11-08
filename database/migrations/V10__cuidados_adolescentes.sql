ALTER TABLE cuidado_estudante DROP CONSTRAINT cuidado_estudante_cuidado_check;
ALTER TABLE cuidado_estudante ADD CONSTRAINT cuidado_estudante_cuidado_check
 CHECK (cuidado IN ('agua', 'alongar', 'longe', 'fruta', 'caminhar', 'conversar', 'sono', 'desenhar', 'cores', 'musica', 'gentileza', 'gratidao', 'natureza', 'dancar', 'arrumar', 'careta', 'notificacoes', 'playlist', 'escrever', 'limites', 'hobby', 'pausatela', 'prioridade', 'reconhecer'));
