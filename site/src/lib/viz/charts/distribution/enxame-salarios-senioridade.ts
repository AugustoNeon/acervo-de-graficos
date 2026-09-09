/**
 * Enxame (beeswarm): distribuição de salário por nível de senioridade.
 *
 * Primeiro gráfico de `distribution` que desenha TODOS os pontos brutos em
 * vez de um resumo estatístico -- o R exporta só nível/salário por pessoa,
 * nunca a posição X do enxame já calculada (mesmo princípio já usado nos
 * outros gráficos desta base). O D3 roda o próprio algoritmo de
 * empacotamento: para cada categoria, os pontos são processados em ordem
 * crescente de valor e cada um recebe o deslocamento horizontal mais
 * próximo do centro que não colide (círculo-círculo) com nenhum ponto já
 * posicionado nas proximidades verticais -- a mesma ideia geral do
 * `geom_beeswarm(method = "swarm")` do R, reimplementada porque não existe
 * equivalente pronto em D3.
 */

import { select, scaleLinear, scaleBand, axisLeft, max } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  nivel: string;
  salario: number;
}

interface Mediana {
  nivel: string;
  mediana: number;
}

interface Dados {
  meta: { cores: Record<string, string>; niveis: string[] };
  pontos: Ponto[];
  medianas: Mediana[];
}

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 20, dir: 24, baixo: 46, esq: 84 };

/**
 * Posição horizontal (relativa ao centro da categoria) de cada ponto, um
 * enxame por vez. Processa em ordem crescente de `valor` -- mesma ordem que
 * o algoritmo "swarm" do R usa -- e tenta deslocamentos alternando lado
 * (0, +passo, -passo, +2passo, -2passo...), aceitando o primeiro que não
 * colide (distância euclidiana >= 2×raio) com nenhum ponto já colocado cuja
 * posição vertical esteja a menos de 2×raio de distância.
 */
function empacotarEnxame<T>(itens: T[], valorDe: (d: T) => number, raio: number): number[] {
  const ordem = itens.map((_, i) => i).sort((a, b) => valorDe(itens[a]) - valorDe(itens[b]));
  const colocados: { x: number; y: number }[] = [];
  const offsets = new Array<number>(itens.length);
  const diametro = raio * 2;

  ordem.forEach((idx) => {
    const y = valorDe(itens[idx]);
    const vizinhos = colocados.filter((p) => Math.abs(p.y - y) < diametro);
    let escolhido = 0;
    for (let passo = 0; passo < 200; passo++) {
      const candidato = passo === 0 ? 0 : (passo % 2 === 1 ? 1 : -1) * Math.ceil(passo / 2) * diametro * 0.92;
      const colide = vizinhos.some((p) => Math.hypot(p.x - candidato, p.y - y) < diametro * 0.92);
      if (!colide) {
        escolhido = candidato;
        break;
      }
    }
    offsets[idx] = escolhido;
    colocados.push({ x: escolhido, y });
  });

  return offsets;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Enxame de pontos: salário mensal de 164 profissionais fictícios, um ponto por pessoa, agrupados em cinco ' +
    'níveis de senioridade de estagiário a especialista, com a mediana de cada nível marcada por um traço.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pontos, medianas } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const xBand = scaleBand<string>().domain(meta.niveis).range([0, larguraUtil]).padding(0.12);
    const maxSalario = max(pontos, (d) => d.salario) ?? 0;
    const y = scaleLinear().domain([0, maxSalario * 1.06]).range([alturaUtil, 0]);

    const RAIO_PX = 3.6;
    const raioVB = px(RAIO_PX);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGrade = g.append('g');
    gGrade.call(
      axisLeft(y)
        .ticks(5)
        .tickSize(-larguraUtil)
        .tickFormat(() => '')
    );
    gGrade.select('.domain').remove();
    gGrade.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', 0.4);

    const gEixoY = g.append('g');
    gEixoY.call(
      axisLeft(y)
        .ticks(5)
        .tickFormat((v) => `R$ ${Number(v).toLocaleString('pt-BR')}`)
        .tickSizeOuter(0)
    );
    estilarEixo(gEixoY, theme, px);

    const gEixoX = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    meta.niveis.forEach((n) => {
      gEixoX
        .append('text')
        .attr('x', (xBand(n) ?? 0) + xBand.bandwidth() / 2)
        .attr('y', px(24))
        .attr('text-anchor', 'middle')
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 700)
        .attr('font-size', px(12))
        .attr('fill', theme.ink)
        .text(n);
    });

    // Empacota cada nível separadamente -- o algoritmo compara distâncias
    // dentro de uma mesma categoria, nunca entre categorias diferentes.
    // Colisão calculada direto em unidades de viewBox (posição Y = y(salário),
    // já em px de viewBox) pra não precisar converter raio entre a escala de
    // salário e a escala de tela.
    const offsetsPorPonto = new Map<Ponto, number>();
    meta.niveis.forEach((nivel) => {
      const doNivel = pontos.filter((p) => p.nivel === nivel);
      const offsets = empacotarEnxame(doNivel, (d) => y(d.salario), raioVB);
      doNivel.forEach((p, i) => offsetsPorPonto.set(p, offsets[i]));
    });

    function cxDe(d: Ponto): number {
      return (xBand(d.nivel) ?? 0) + xBand.bandwidth() / 2 + (offsetsPorPonto.get(d) ?? 0);
    }

    const chaveDe = (d: Ponto, i: number) => `${d.nivel}-${i}`;
    const circulos = g
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(pontos, chaveDe as never)
      .join('circle')
      .attr('data-interactive', '')
      .attr('cx', cxDe)
      .attr('cy', (d) => y(d.salario))
      .attr('r', px(RAIO_PX))
      .attr('fill', (d) => meta.cores[d.nivel] ?? theme.primary)
      .attr('fill-opacity', 0.85)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(0.6));

    const medianasSel = g
      .selectAll<SVGLineElement, Mediana>('line.mediana')
      .data(medianas, (d) => d.nivel)
      .join('line')
      .attr('class', 'mediana')
      .attr('x1', (d) => xBand(d.nivel) ?? 0)
      .attr('x2', (d) => (xBand(d.nivel) ?? 0) + xBand.bandwidth())
      .attr('y1', (d) => y(d.mediana))
      .attr('y2', (d) => y(d.mediana))
      .attr('stroke', theme.ink)
      .attr('stroke-width', px(2));

    function mostrarTooltip(evento: PointerEvent, d: Ponto) {
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.nivel]}"></span>` +
          `<strong>${d.nivel}</strong><br>R$ ${d.salario.toLocaleString('pt-BR')} / mês`,
        evento
      );
    }
    circulos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    function realcar(nivel: string) {
      circulos.attr('fill-opacity', (d) => (d.nivel === nivel ? 1 : 0.12));
      medianasSel.attr('opacity', (d) => (d.nivel === nivel ? 1 : 0.15));
      legenda.attr('opacity', (n) => (n === nivel ? 1 : 0.5));
    }
    function limpar() {
      circulos.attr('fill-opacity', 0.85);
      medianasSel.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    tornarFixavel(root, { selecao: circulos, chaveDe: (d: Ponto) => d.nivel }, realcar, limpar);

    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(meta.niveis)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((n) => `<span class="viz-swatch" style="background:${meta.cores[n]}"></span>${n}`)
      .on('pointerenter', (_e, n) => realcar(n))
      .on('pointerleave', limpar);

    if (animate) {
      circulos.attr('r', 0);
      medianasSel.attr('opacity', 0);

      const nivelIndex = new Map(meta.niveis.map((n, i) => [n, i]));
      circulos
        .transition()
        .delay((d) => stagger(nivelIndex.get(d.nivel) ?? 0, meta.niveis.length, 480))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', px(RAIO_PX));

      medianasSel.transition().delay(DURATION.enter * 0.7).duration(DURATION.base).attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        circulos.interrupt().attr('r', px(RAIO_PX));
        medianasSel.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
