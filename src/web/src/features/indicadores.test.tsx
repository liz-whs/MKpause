import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminIndicadores } from './admin/Indicadores';
import { violacoes } from '../test/axe';

afterEach(()=>vi.unstubAllGlobals());
const base={periodo:{dias:7,inicio:'2026-10-29',fim:'2026-11-04'},minimo_estudantes:5};

describe('indicadores da escola',()=>{
  it('mostra amostra insuficiente sem inventar contagens',async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json({...base,suficiente:false}));
    vi.stubGlobal('fetch',fetch);
    const {container}=render(<main><AdminIndicadores /></main>);
    expect(await screen.findByText(/Ainda não há dados suficientes/)).toBeInTheDocument();
    expect(screen.queryByText('Pausas no período')).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/indicadores/api/resumo?dias=30',expect.objectContaining({credentials:'same-origin'}));
    expect(await violacoes(container)).toEqual([]);
  });
  it('mostra agregados e proteção dos grupos pequenos',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({...base,suficiente:true,
      totais:{pausas:10,estudantes:5,avisos_de_saida:null,alertas_nivel_3:null},
      pausas_por_dia:[{dia:'2026-11-04',pausas:10}],pausas_por_hora:[{hora:10,pausas:10}],
      atividades:[],turmas:[],humor:null,ocultos:{atividades:true,turmas:true},
    })));
    const {container}=render(<main><AdminIndicadores /></main>);
    await screen.findByText('Pausas no período');
    expect(screen.getAllByText('Protegido')).toHaveLength(2);
    expect(screen.getAllByText(/Distribuição protegida/)).toHaveLength(2);
    expect(await violacoes(container)).toEqual([]);
  });
  it('troca o período e não reutiliza contagens do anterior',async()=>{
    const fetch=vi.fn().mockImplementation(async()=>Response.json({...base,suficiente:false}));
    vi.stubGlobal('fetch',fetch);
    render(<AdminIndicadores />);
    await screen.findByText(/Ainda não há dados suficientes/);
    await userEvent.selectOptions(screen.getByLabelText('Período'),'90');
    await waitFor(()=>expect(fetch).toHaveBeenLastCalledWith('/indicadores/api/resumo?dias=90',expect.anything()));
  });
  it('mostra falta de permissão da API sem exibir números',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({detail:'Só a administração da escola vê os indicadores.'},{status:403})));
    render(<AdminIndicadores />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Só a administração');
    expect(screen.queryByText('Pausas no período')).toBeNull();
  });
});
