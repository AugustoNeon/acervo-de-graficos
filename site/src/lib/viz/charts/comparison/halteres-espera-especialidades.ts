/**
 * Halteres ↔ inclinação ↔ barras divergentes — três leituras do mesmo par.
 *
 * O dado é sempre o mesmo: dois números por especialidade (a espera de 2023 e
 * a de 2025). O que muda entre os estados é a PERGUNTA que a codificação
 * responde — "quanto se esperava em cada momento" (halteres), "que trajetória
 * cada especialidade descreveu" (inclinação) e "qual foi o saldo" (divergente).
 * Por isso nenhum elemento é criado ou destruído na troca: os mesmos quatro
 * elementos por linha (haste, dois círculos e a área de captura de ponteiro)
 * são reposicionados, e a transição contínua entre as posições é o que deixa
 * seguir uma especialidade de uma leitura pra outra sem perdê-la de vista.
 *
 * A imagem estática cobre só o estado "halteres" — os outros dois existem
 * apenas aqui, mesmo arranjo já usado nos modos de cor do sunburst.
 */

import {
  select,
  scaleLinear,
  scaleBand,
  axisBottom,
  axisLeft,
  format,
  type Selection,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Linha {
  especialidade: string;
  antes: number;
  depois: number;
  delta: number;
}

interface Dados {
  meta: {
    rotuloAntes: string;
    rotuloDepois: string;
    unidade: string;
    paleta: { antes: string; depois: string; melhora: string; piora: string; haste: string };
    nota?: string;
  };
  linhas: Linha[];
}

type EstadoId = 'halteres' | 'inclinacao' | 'divergente';
type OrdemId = 'atual' | 'variacao' | 'alfabetica';

const ESTADOS: { id: EstadoId; rotulo: string }[] = [
  { id: 'halteres', rotulo: 'Halteres' },
  { id: 'inclinacao', rotulo: 'Inclinação' },
  { id: 'divergente', rotulo: 'Divergente' },
];

const ORDENS: { id: OrdemId; rotulo: string }[] = [
  { id: 'atual', rotulo: 'Espera atual' },
  { id: 'variacao', rotulo: 'Variação' },
  { id: 'alfabetica', rotulo: 'A–Z' },
];

const VB_W = 900;
const VB_H = 600;
const MARGEM = { topo: 34, dir: 76, baixo: 56, esq: 176 };

/** Espessura da haste em cada estado — é ela que vira a barra no divergente. */
const ESPESSURA: Record<EstadoId, number> = { halteres: 7, inclinacao: 3, divergente: 20 };
const RAIO: Record<EstadoId, number> = { halteres: 8, inclinacao: 6, divergente: 0 };

interface Alvo {
  xa: number;
  ya: number;
  xb: number;
  yb: number;
  /** Posição do rótulo de variação, que muda de coluna fixa para ponta da barra. */
  xDelta: number;
  ancoraDelta: 'start' | 'end';
}

const fmtDelta = format('+d');

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Gráfico de halteres comparando o tempo médio de espera por especialidade médica em dois ' +
    'momentos, com variações alternáveis em gráfico de inclinação e barras divergentes.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, linhas } = data as Dados;
    const { paleta, rotuloAntes, rotuloDepois, unidade } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const maxValor = Math.max(...linhas.map((l) => Math.max(l.antes, l.depois)));
    const maxDelta = Math.max(...linhas.map((l) => Math.abs(l.delta)));

    const xValor = scaleLinear().domain([0, maxValor * 1.08]).range([0, larguraUtil]);
    const yValor = scaleLinear().domain([0, maxValor * 1.08]).range([alturaUtil, 0]);
    const xDelta = scaleLinear().domain([-maxDelta * 1.18, maxDelta * 1.18]).range([0, larguraUtil]);
    const yCat = scaleBand<string>().domain(linhas.map((l) => l.especialidade)).range([0, alturaUtil]).padding(0.34);

    // Colunas do estado de inclinação: afastadas das bordas pra sobrar espaço
    // pros valores nas pontas de cada linha.
    const colunaA = larguraUtil * 0.3;
    const colunaB = larguraUtil * 0.7;

    const corDelta = (l: Linha) => (l.delta <= 0 ? paleta.melhora : paleta.piora);
    const centro = (l: Linha) => (yCat(l.especialidade) ?? 0) + yCat.bandwidth() / 2;

    function ordenar(id: OrdemId): string[] {
      const copia = [...linhas];
      if (id === 'atual') copia.sort((a, b) => b.depois - a.depois);
      else if (id === 'variacao') copia.sort((a, b) => b.delta - a.delta);
      else copia.sort((a, b) => a.especialidade.localeCompare(b.especialidade, 'pt-BR'));
      return copia.map((l) => l.especialidade);
    }

    function alvoDe(l: Linha, estado: EstadoId): Alvo {
      if (estado === 'inclinacao') {
        return {
          xa: colunaA,
          ya: yValor(l.antes),
          xb: colunaB,
          yb: yValor(l.depois),
          xDelta: colunaB,
          ancoraDelta: 'start',
        };
      }
      if (estado === 'divergente') {
        const y = centro(l);
        const ponta = xDelta(l.delta);
        return {
          xa: xDelta(0),
          ya: y,
          xb: ponta,
          yb: y,
          xDelta: ponta + (l.delta > 0 ? 10 : -10),
          ancoraDelta: l.delta > 0 ? 'start' : 'end',
        };
      }
      const y = centro(l);
      return {
        xa: xValor(l.antes),
        ya: y,
        xb: xValor(l.depois),
        yb: y,
        xDelta: larguraUtil + 14,
        ancoraDelta: 'start',
      };
    }

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    // Ordem de empilhamento: grades e eixos atrás, dado na frente, captura de
    // ponteiro por último (fica por cima de tudo, sem tapar nada visualmente).
    const gGradeV = g.append('g');
    const gGradeH = g.append('g').attr('opacity', 0);
    const gZero = g.append('g').attr('opacity', 0);
    const gEixoBaixo = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const gEixoEsq = g.append('g').attr('opacity', 0);
    const gColunas = g.append('g').attr('opacity', 0);
    const gDado = g.append('g');
    const gCaptura = g.append('g');

    gZero.append('line').attr('stroke', theme.borderStrong).attr('stroke-dasharray', '4 4');

    gColunas
      .selectAll('text')
      .data([
        { x: colunaA, texto: rotuloAntes },
        { x: colunaB, texto: rotuloDepois },
      ])
      .join('text')
      .attr('x', (d) => d.x)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .attr('font-weight', 600)
      .text((d) => d.texto);

    const rotuloEixoX = g
      .append('text')
      .attr('x', larguraUtil / 2)
      .attr('y', alturaUtil + 46)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12));

    const rotuloEixoY = g
      .append('text')
      .attr('transform', `translate(${-56},${alturaUtil / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('opacity', 0)
      .text(`Tempo médio de espera (${unidade})`);

    const chaveDe = (l: Linha) => l.especialidade;

    const hastes = gDado
      .selectAll<SVGLineElement, Linha>('line')
      .data(linhas, chaveDe)
      .join('line')
      .attr('stroke-linecap', 'round');

    const circulosAntes = gDado
      .selectAll<SVGCircleElement, Linha>('circle.antes')
      .data(linhas, chaveDe)
      .join('circle')
      .attr('class', 'antes')
      .attr('fill', paleta.antes)
      .attr('stroke', theme.bg)
      .attr('stroke-width', 1.5);

    const circulosDepois = gDado
      .selectAll<SVGCircleElement, Linha>('circle.depois')
      .data(linhas, chaveDe)
      .join('circle')
      .attr('class', 'depois')
      .attr('fill', paleta.depois)
      .attr('stroke', theme.bg)
      .attr('stroke-width', 1.5);

    const rotulos = gDado
      .selectAll<SVGTextElement, Linha>('text.nome')
      .data(linhas, chaveDe)
      .join('text')
      .attr('class', 'nome')
      .attr('x', -14)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('data-interactive', '')
      .text((l) => l.especialidade);

    const valoresDelta = gDado
      .selectAll<SVGTextElement, Linha>('text.delta')
      .data(linhas, chaveDe)
      .join('text')
      .attr('class', 'delta')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(12))
      .attr('font-weight', 600)
      .attr('fill', corDelta)
      .text((l) => fmtDelta(l.delta));

    // Linha invisível e grossa por cima da haste: a haste real tem 3px de
    // espessura no estado de inclinação, estreita demais pra acertar com o
    // ponteiro. Como ela acompanha exatamente a mesma geometria, o alvo de
    // captura continua valendo nos três estados sem código extra.
    const capturas = gCaptura
      .selectAll<SVGLineElement, Linha>('line')
      .data(linhas, chaveDe)
      .join('line')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 26)
      .attr('stroke-linecap', 'round')
      .attr('data-interactive', '')
      .on('pointermove', (evento: PointerEvent, l: Linha) => tooltip.show(conteudoTooltip(l), evento))
      .on('pointerleave', () => tooltip.hide());

    function conteudoTooltip(l: Linha): string {
      const variacao = ((l.delta / l.antes) * 100).toFixed(0);
      const sinal = l.delta <= 0 ? 'a menos' : 'a mais';
      return (
        `<strong>${l.especialidade}</strong><br>` +
        `${rotuloAntes}: ${l.antes} ${unidade} · ${rotuloDepois}: ${l.depois} ${unidade}<br>` +
        `<span class="viz-swatch" style="background:${corDelta(l)}"></span>` +
        `${Math.abs(l.delta)} ${unidade} ${sinal} (${fmtDelta(Number(variacao))}%)`
      );
    }

    let estadoAtual: EstadoId = 'halteres';
    let ordemAtual: OrdemId = 'atual';
    let realceLinha: string | null = null;
    let realceMomento: 'antes' | 'depois' | null = null;
    const alvos = new Map<string, Alvo>();

    function aplicarRealce() {
      const opacidadeLinha = (l: Linha) => (realceLinha && l.especialidade !== realceLinha ? 0.18 : 1);
      // No divergente não existem dois pontos pra separar — a barra É o saldo,
      // e apagá-la pra "mostrar só 2023" deixaria a tela vazia. O realce por
      // momento fica desligado ali (os botões da legenda também, logo abaixo),
      // sem apagar o estado guardado: voltando pros halteres ele volta a valer.
      const momentoAtivo = estadoAtual === 'divergente' ? null : realceMomento;
      const opacidadeMomento = (momento: 'antes' | 'depois') =>
        momentoAtivo && momentoAtivo !== momento ? 0.1 : 1;

      const t = <S extends Selection<any, Linha, any, any>>(s: S) =>
        s.transition('realce').duration(DURATION.fast);

      t(hastes).attr('opacity', (l) => opacidadeLinha(l) * (momentoAtivo ? 0.12 : 1));
      t(circulosAntes).attr('opacity', (l) => opacidadeLinha(l) * opacidadeMomento('antes'));
      t(circulosDepois).attr('opacity', (l) => opacidadeLinha(l) * opacidadeMomento('depois'));
      t(rotulos).attr('opacity', (l) => (estadoAtual === 'inclinacao' ? 0 : opacidadeLinha(l)));
      t(valoresDelta).attr('opacity', (l) => (estadoAtual === 'inclinacao' ? 0 : opacidadeLinha(l)));
    }

    function realcar(chave: string) {
      const [tipo, valor] = chave.split(':');
      if (tipo === 'momento') {
        realceMomento = valor as 'antes' | 'depois';
        realceLinha = null;
      } else {
        realceLinha = valor;
        realceMomento = null;
      }
      aplicarRealce();
    }

    function limparRealce() {
      realceLinha = null;
      realceMomento = null;
      aplicarRealce();
    }

    function desenharMoldura(estado: EstadoId, transicao: boolean) {
      const dur = transicao ? DURATION.slow : 0;
      const escalaX = estado === 'divergente' ? xDelta : xValor;

      const eixoX = axisBottom(escalaX).ticks(6).tickSizeOuter(0);
      // `+d` puro escreveria "+0" no zero — que num eixo de variação é o ponto
      // neutro, não um ganho de zero.
      if (estado === 'divergente') {
        eixoX.tickFormat(((v: number) => (v === 0 ? '0' : fmtDelta(v))) as never);
      }
      const gradeX = axisBottom(escalaX).ticks(6).tickSize(-alturaUtil).tickFormat(() => '');

      (transicao ? gEixoBaixo.transition().duration(dur).ease(EASE_STATE) : gEixoBaixo).call(eixoX as never);
      (transicao ? gGradeV.transition().duration(dur).ease(EASE_STATE) : gGradeV).call(gradeX as never);
      // Estilizar sempre a seleção, não a transição: os `<g class="tick">` novos
      // que o eixo cria só existem depois do .call(), e pintá-los dentro da
      // transição deixaria os ticks recém-criados com a cor padrão do d3.
      estilarEixo(gEixoBaixo, theme, px);
      estilarGrade(gGradeV, theme);

      gEixoEsq.call(axisLeft(yValor).ticks(6).tickSizeOuter(0) as never);
      gGradeH.call(axisLeft(yValor).ticks(6).tickSize(-larguraUtil).tickFormat(() => '') as never);
      estilarEixo(gEixoEsq, theme, px);
      estilarGrade(gGradeH, theme);

      gZero
        .select('line')
        .attr('x1', xDelta(0))
        .attr('x2', xDelta(0))
        .attr('y1', 0)
        .attr('y2', alturaUtil);

      const ehInclinacao = estado === 'inclinacao';
      const fade = (sel: Selection<SVGGElement, unknown, null, undefined>, visivel: boolean) =>
        (transicao ? sel.transition().duration(dur).ease(EASE_STATE) : sel).attr('opacity', visivel ? 1 : 0);

      fade(gGradeV, !ehInclinacao);
      fade(gEixoBaixo, !ehInclinacao);
      fade(gGradeH, ehInclinacao);
      fade(gEixoEsq, ehInclinacao);
      fade(gColunas, ehInclinacao);
      fade(gZero, estado === 'divergente');

      (transicao ? rotuloEixoY.transition().duration(dur).ease(EASE_STATE) : rotuloEixoY).attr(
        'opacity',
        ehInclinacao ? 1 : 0
      );
      (transicao ? rotuloEixoX.transition().duration(dur).ease(EASE_STATE) : rotuloEixoX).attr(
        'opacity',
        ehInclinacao ? 0 : 1
      );
      rotuloEixoX.text(
        estado === 'divergente'
          ? `Variação de ${rotuloAntes} para ${rotuloDepois} (${unidade})`
          : `Tempo médio de espera (${unidade})`
      );
    }

    function aplicarEstado(estado: EstadoId, ordem: OrdemId, transicao: boolean) {
      estadoAtual = estado;
      ordemAtual = ordem;
      yCat.domain(ordenar(ordem));
      linhas.forEach((l) => alvos.set(l.especialidade, alvoDe(l, estado)));

      const alvo = (l: Linha) => alvos.get(l.especialidade)!;
      const dur = transicao ? DURATION.slow : 0;

      // `Selection` e `Transition` expõem o mesmo `.attr(nome, fn)` encadeável,
      // mas não têm supertipo comum: numa UNIÃO dos dois o TypeScript resolve
      // `.attr` pela sobrecarga de LEITURA da Selection (que devolve `string`)
      // e todo encadeamento a partir dali quebra. Tratar a transição como
      // seleção resolve isso num ponto só — o resultado deste helper nunca
      // recebe nada além de `.attr`, que as duas implementam igual.
      type ComoSelecao = Selection<any, Linha, any, any>;
      const t = (s: ComoSelecao): ComoSelecao =>
        transicao ? (s.transition().duration(dur).ease(EASE_STATE) as unknown as ComoSelecao) : s;

      const geometriaHaste = (s: ComoSelecao) =>
        s
          .attr('x1', (l: Linha) => alvo(l).xa)
          .attr('y1', (l: Linha) => alvo(l).ya)
          .attr('x2', (l: Linha) => alvo(l).xb)
          .attr('y2', (l: Linha) => alvo(l).yb);

      // `round` engorda a haste em meia espessura de cada lado. Nos halteres
      // isso é só acabamento (o comprimento que importa está entre os dois
      // círculos), mas no divergente a haste É a barra, e a ponta arredondada
      // faria uma variação de 1 dia ocupar quase o mesmo comprimento que uma
      // de 3 — exagerando justamente as menores. `butt` corta no valor exato.
      hastes.attr('stroke-linecap', estado === 'divergente' ? 'butt' : 'round');
      geometriaHaste(t(hastes))
        .attr('stroke-width', ESPESSURA[estado])
        .attr('stroke', (l: Linha) => (estado === 'halteres' ? paleta.haste : corDelta(l)));
      // A camada de captura acompanha a haste sem transição: ela é invisível,
      // e animar 12 linhas a mais só custaria quadro.
      geometriaHaste(capturas);

      t(circulosAntes)
        .attr('cx', (l: Linha) => alvo(l).xa)
        .attr('cy', (l: Linha) => alvo(l).ya)
        .attr('r', RAIO[estado]);
      t(circulosDepois)
        .attr('cx', (l: Linha) => alvo(l).xb)
        .attr('cy', (l: Linha) => alvo(l).yb)
        .attr('r', RAIO[estado]);

      t(rotulos).attr('y', (l: Linha) => centro(l));
      // `text-anchor` não interpola — trocar de uma vez no início da transição
      // é o certo aqui: a âncora só muda quando o rótulo troca de lado no
      // estado divergente, e o valor intermediário não teria significado.
      valoresDelta.attr('text-anchor', (l: Linha) => alvo(l).ancoraDelta);
      t(valoresDelta)
        .attr('x', (l: Linha) => alvo(l).xDelta)
        .attr('y', (l: Linha) => alvo(l).ya);

      desenharMoldura(estado, transicao);
      aplicarRealce();

      botoesEstado.attr('aria-pressed', (e) => String(e.id === estado));
      botoesOrdem
        .attr('aria-pressed', (o) => String(o.id === ordem))
        // Ordenar não faz nada quando a posição vertical é o próprio valor:
        // desabilitar é mais honesto do que oferecer um botão inerte.
        .attr('disabled', estado === 'inclinacao' ? '' : null)
        .attr('title', estado === 'inclinacao' ? 'No modo inclinação a posição vertical é o valor, não a ordem' : null);
      botoesLegenda
        .attr('disabled', estado === 'divergente' ? '' : null)
        .attr('title', estado === 'divergente' ? 'O modo divergente mostra o saldo, não os dois momentos' : null);
    }

    const controles = select(root).append('div').attr('class', 'viz-controles');
    controles.append('span').attr('class', 'viz-controles-rotulo').text('Leitura');
    const botoesEstado = controles
      .selectAll<HTMLButtonElement, (typeof ESTADOS)[number]>('button.estado')
      .data(ESTADOS)
      .join('button')
      .attr('class', 'estado')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((e) => e.rotulo)
      .on('click', (_ev, e) => {
        if (e.id === estadoAtual) return;
        aplicarEstado(e.id, ordemAtual, true);
      });

    const controlesOrdem = select(root).append('div').attr('class', 'viz-controles');
    controlesOrdem.append('span').attr('class', 'viz-controles-rotulo').text('Ordenar por');
    const botoesOrdem = controlesOrdem
      .selectAll<HTMLButtonElement, (typeof ORDENS)[number]>('button.ordem')
      .data(ORDENS)
      .join('button')
      .attr('class', 'ordem')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((o) => o.rotulo)
      .on('click', (_ev, o) => {
        if (o.id === ordemAtual) return;
        aplicarEstado(estadoAtual, o.id, true);
      });

    // A legenda precisa existir antes do primeiro `aplicarEstado`: é ele quem
    // decide, a cada estado, se os botões dela ficam habilitados.
    const legenda = select(root).append('div').attr('class', 'viz-legenda');
    const botoesLegenda = legenda
      .selectAll<HTMLButtonElement, { id: 'antes' | 'depois'; rotulo: string; cor: string }>('button')
      .data([
        { id: 'antes' as const, rotulo: rotuloAntes, cor: paleta.antes },
        { id: 'depois' as const, rotulo: rotuloDepois, cor: paleta.depois },
      ])
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((m) => `<span class="viz-swatch" style="background:${m.cor}"></span>${m.rotulo}`);

    aplicarEstado('halteres', 'atual', false);

    tornarFixavel(
      root,
      [
        { selecao: capturas, chaveDe: (l: Linha) => `linha:${l.especialidade}` },
        { selecao: rotulos, chaveDe: (l: Linha) => `linha:${l.especialidade}` },
        { selecao: botoesLegenda, chaveDe: (m: { id: string }) => `momento:${m.id}` },
      ],
      realcar,
      limparRealce
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      // Entrada com significado: cada halter nasce fechado no ponto de partida
      // (a espera de 2023) e se abre até o valor de 2025 — a própria animação
      // conta a mudança que o gráfico mede.
      const alvo = (l: Linha) => alvos.get(l.especialidade)!;

      hastes.attr('x2', (l) => alvo(l).xa).attr('y2', (l) => alvo(l).ya);
      circulosDepois.attr('cx', (l) => alvo(l).xa).attr('cy', (l) => alvo(l).ya).attr('r', 0);
      circulosAntes.attr('r', 0);
      valoresDelta.attr('opacity', 0);

      hastes
        .transition()
        .delay((_l, i) => stagger(i, linhas.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x2', (l) => alvo(l).xb)
        .attr('y2', (l) => alvo(l).yb);

      circulosAntes
        .transition()
        .delay((_l, i) => stagger(i, linhas.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', RAIO.halteres);

      circulosDepois
        .transition()
        .delay((_l, i) => stagger(i, linhas.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('cx', (l) => alvo(l).xb)
        .attr('cy', (l) => alvo(l).yb)
        .attr('r', RAIO.halteres);

      valoresDelta
        .transition()
        .delay((_l, i) => stagger(i, linhas.length) + DURATION.base)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + DURATION.base + 250, () => {
        hastes.interrupt().attr('x2', (l) => alvo(l).xb).attr('y2', (l) => alvo(l).yb);
        circulosAntes.interrupt().attr('r', RAIO.halteres);
        circulosDepois
          .interrupt()
          .attr('cx', (l) => alvo(l).xb)
          .attr('cy', (l) => alvo(l).yb)
          .attr('r', RAIO.halteres);
        valoresDelta.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
