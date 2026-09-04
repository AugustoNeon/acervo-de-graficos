/**
 * Gráfico ternário: composição nutricional (proteína/carboidrato/gordura).
 *
 * Geometria nova neste acervo — coordenadas baricêntricas dentro de um
 * triângulo, em vez de eixos X/Y cartesianos comuns. O R não exporta x/y
 * prontos: o D3 recebe as três frações brutas e recalcula a MESMA
 * transformação (`baricentricaParaXY`, espelhando a função do script.R),
 * garantindo que um ponto nunca caia num lugar diferente do triângulo
 * entre as duas versões — sem precisar compartilhar geometria nenhuma,
 * só a fórmula.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Alimento {
  alimento: string;
  proteina: number;
  carboidrato: number;
  gordura: number;
  perfil: string;
}

interface Dados {
  meta: { cores: Record<string, string> };
  alimentos: Alimento[];
}

const VB_W = 900;
const MARGEM = { topo: 70, dir: 70, baixo: 60, esq: 70 };
const LADO = VB_W - MARGEM.esq - MARGEM.dir;
const H = (Math.sqrt(3) / 2) * LADO;
const VB_H = MARGEM.topo + H + MARGEM.baixo;
const NIVEIS = [0.25, 0.5, 0.75];

/** Espelha `baricentrica_para_xy()` do script.R -- mesma fórmula, unidades
 * de lado do triângulo (0..LADO) em vez de 0..1. */
function baricentricaParaXY(proteina: number, carboidrato: number, gordura: number): [number, number] {
  const total = proteina + carboidrato + gordura;
  const a = proteina / total;
  const c = gordura / total;
  return [(c + a / 2) * LADO, a * H];
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Gráfico ternário mostrando a composição de proteína, carboidrato e gordura de 24 alimentos ' +
    'fictícios, coloridos pelo macronutriente dominante.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, alimentos } = data as Dados;
    const pontos = alimentos.map((a) => {
      const [x, y] = baricentricaParaXY(a.proteina, a.carboidrato, a.gordura);
      return { ...a, x, y };
    });

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    // y cresce pra baixo no SVG, mas a altura do triângulo (H) precisa
    // crescer pra CIMA a partir da base -- por isso o eixo Y é invertido
    // aqui (topo do triângulo em y=0 do grupo, base em y=H).
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo + H}) scale(1,-1)`);

    const vertices: [number, number][] = [
      [LADO / 2, H], // proteína
      [0, 0], // carboidrato
      [LADO, 0], // gordura
    ];

    function segmentoNivel(familia: 'proteina' | 'carboidrato' | 'gordura', k: number): [[number, number], [number, number]] {
      if (familia === 'proteina') return [[0.5 * k * LADO, H * k], [(1 - 0.5 * k) * LADO, H * k]];
      if (familia === 'carboidrato') return [[(1 - k) * LADO, 0], [0.5 * (1 - k) * LADO, H * (1 - k)]];
      return [[k * LADO, 0], [(0.5 + 0.5 * k) * LADO, H * (1 - k)]];
    }

    const gGrade = g.append('g');
    (['proteina', 'carboidrato', 'gordura'] as const).forEach((familia) => {
      NIVEIS.forEach((k) => {
        const [[x1, y1], [x2, y2]] = segmentoNivel(familia, k);
        gGrade
          .append('line')
          .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
          .attr('stroke', theme.border)
          .attr('stroke-width', px(0.8));
      });
    });

    g.append('polygon')
      .attr('points', vertices.map(([x, y]) => `${x},${y}`).join(' '))
      .attr('fill', 'none')
      .attr('stroke', theme.inkMuted)
      .attr('stroke-width', px(1.6));

    // Rótulos dos vértices ficam num grupo à parte, sem o flip vertical do
    // resto (senão o texto nasceria de cabeça pra baixo).
    const gRotulos = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo + H})`);
    // Rótulos de Carboidrato/Gordura crescem PRA DENTRO do triângulo a
    // partir do próprio vértice (nunca pra fora dele) -- texto dimensionado
    // em px reais via px() não encolhe junto com a margem em unidades de
    // viewBox quando o container fica estreito, então ancorar o texto pra
    // fora do vértice deixaria a palavra vazando da viewBox em telas
    // estreitas (mesma armadilha já registrada em AGENTS.md "Lições
    // aprendidas" pra outro gráfico desta categoria).
    const rotulosVertice: { x: number; y: number; texto: string; ancora: string; dy: string }[] = [
      { x: LADO / 2, y: -H - px(14), texto: 'Proteína', ancora: 'middle', dy: '0em' },
      { x: 0, y: px(20), texto: 'Carboidrato', ancora: 'start', dy: '0em' },
      { x: LADO, y: px(20), texto: 'Gordura', ancora: 'end', dy: '0em' },
    ];
    gRotulos
      .selectAll('text')
      .data(rotulosVertice)
      .join('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('dy', (d) => d.dy)
      .attr('text-anchor', (d) => d.ancora)
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(15))
      .attr('fill', theme.ink)
      .text((d) => d.texto);

    const chaveDe = (d: (typeof pontos)[number]) => d.alimento;
    const circulos = g
      .selectAll<SVGCircleElement, (typeof pontos)[number]>('circle')
      .data(pontos, chaveDe)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', px(6))
      .attr('fill', (d) => meta.cores[d.perfil])
      .attr('fill-opacity', 0.9)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.2))
      .attr('data-interactive', '');

    circulos
      .on('pointermove', (evento: PointerEvent, d: (typeof pontos)[number]) => {
        tooltip.show(
          `<span class="viz-swatch" style="background:${meta.cores[d.perfil]}"></span>` +
            `<strong>${d.alimento}</strong><br>proteína ${d.proteina}% · carboidrato ${d.carboidrato}% · gordura ${d.gordura}%`,
          evento
        );
      })
      .on('pointerleave', () => tooltip.hide());

    // -------------------------------------------------------------- realce
    function realcar(perfil: string) {
      circulos.attr('opacity', (d) => (d.perfil === perfil ? 1 : 0.2));
      legenda.attr('opacity', (p) => (p === perfil ? 1 : 0.5));
    }
    function limpar() {
      circulos.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    const perfis = Object.keys(meta.cores);
    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(perfis)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((p) => `<span class="viz-swatch" style="background:${meta.cores[p]}"></span>${p}`);

    tornarFixavel(
      root,
      [
        { selecao: circulos, chaveDe: (d: (typeof pontos)[number]) => d.perfil },
        { selecao: legenda, chaveDe: (p: string) => p },
      ],
      realcar,
      limpar
    );

    // -------------------------------------------------------------- entrada
    if (animate) {
      circulos.attr('r', 0);
      circulos
        .transition()
        .delay((_d, i) => stagger(i, pontos.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', px(6));

      garantirEstadoFinal(DURATION.enter + 250, () => {
        circulos.interrupt().attr('r', px(6));
      });
    }
  },
};

export default chart;
